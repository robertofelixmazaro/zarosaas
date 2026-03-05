import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { store_name, owner_name, owner_email, owner_password } = await req.json();

    if (!store_name?.trim() || !owner_email?.trim() || !owner_password?.trim()) {
      return new Response(JSON.stringify({ error: "Nome da loja, email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: owner_email.trim(),
      password: owner_password.trim(),
      email_confirm: true,
      user_metadata: { name: owner_name?.trim() || owner_email.trim() },
    });

    if (createErr) {
      const msg = createErr.message?.includes("already been registered")
        ? "Este email já está cadastrado no sistema"
        : "Erro ao criar usuário: " + createErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // 2. Generate slug
    const slug = store_name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    // 3. Create tenant
    const { data: tenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert({
        name: store_name.trim(),
        slug,
        owner_user_id: newUserId,
      })
      .select("id, slug")
      .single();

    if (tenantErr) {
      // Cleanup: delete the user we just created
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Erro ao criar loja: " + tenantErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Update profile with tenant_id
    await adminClient
      .from("profiles")
      .update({ tenant_id: tenant.id })
      .eq("auth_id", newUserId);

    // 5. Update role to admin with tenant_id
    await adminClient
      .from("user_roles")
      .update({ role: "admin", tenant_id: tenant.id })
      .eq("user_id", newUserId);

    // 6. Initialize site settings
    await adminClient.from("site_settings").insert([
      { key: "shop_name", value: store_name.trim(), tenant_id: tenant.id },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        store: { id: tenant.id, slug: tenant.slug, name: store_name.trim() },
        credentials: { email: owner_email.trim(), password: owner_password.trim() },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
