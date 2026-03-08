import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    if (!authHeader) return jsonResp({ error: "Não autenticado" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return jsonResp({ error: "Não autenticado" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) return jsonResp({ error: "Acesso negado" }, 403);

    const { store_name, owner_name, owner_email, owner_password } = await req.json();

    if (!store_name?.trim() || !owner_email?.trim() || !owner_password?.trim()) {
      return jsonResp({ error: "Nome da loja, email e senha são obrigatórios" }, 400);
    }

    // 1. Create auth user (email pre-confirmed)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: owner_email.trim(),
      password: owner_password.trim(),
      email_confirm: true,
      user_metadata: {
        name: owner_name?.trim() || owner_email.trim(),
        account_type: "admin",
      },
    });

    if (createErr) {
      const msg = createErr.message?.includes("already been registered")
        ? "Este email já está cadastrado no sistema"
        : "Erro ao criar usuário: " + createErr.message;
      return jsonResp({ error: msg }, 400);
    }

    const newUserId = newUser.user.id;
    const displayName = owner_name?.trim() || owner_email.trim();

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
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResp({ error: "Erro ao criar loja: " + tenantErr.message }, 500);
    }

    // 4. Ensure profile exists with tenant_id (upsert to handle trigger race)
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("auth_id", newUserId)
      .maybeSingle();

    if (existingProfile) {
      await adminClient
        .from("profiles")
        .update({ tenant_id: tenant.id, name: displayName, email: owner_email.trim() })
        .eq("auth_id", newUserId);
    } else {
      await adminClient
        .from("profiles")
        .insert({
          auth_id: newUserId,
          name: displayName,
          email: owner_email.trim(),
          tenant_id: tenant.id,
        });
    }

    // 5. Ensure user_role exists with correct role and tenant_id
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", newUserId)
      .maybeSingle();

    if (existingRole) {
      await adminClient
        .from("user_roles")
        .update({ role: "admin", tenant_id: tenant.id })
        .eq("user_id", newUserId);
    } else {
      await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin", tenant_id: tenant.id });
    }

    // 6. Initialize site settings
    await adminClient.from("site_settings").insert([
      { key: "shop_name", value: store_name.trim(), tenant_id: tenant.id },
    ]);

    console.log(`Store created: ${tenant.slug} (${tenant.id}) for user ${newUserId}`);

    return jsonResp({
      success: true,
      store: { id: tenant.id, slug: tenant.slug, name: store_name.trim() },
      credentials: { email: owner_email.trim(), password: owner_password.trim() },
    });
  } catch (err) {
    console.error("Create store error:", err);
    return jsonResp({ error: "Erro interno do servidor" }, 500);
  }
});
