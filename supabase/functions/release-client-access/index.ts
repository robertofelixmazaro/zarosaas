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

    // Verify caller
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

    // Verify caller is an affiliate
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: affiliate } = await adminClient
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!affiliate) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sale_id, client_email, client_name, store_name } = await req.json();

    if (!sale_id || !client_email) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the sale belongs to this affiliate and payment is confirmed
    const { data: sale } = await adminClient
      .from("affiliate_sales")
      .select("*")
      .eq("id", sale_id)
      .eq("affiliate_id", affiliate.id)
      .maybeSingle();

    if (!sale) {
      return new Response(JSON.stringify({ error: "Venda não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sale.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Pagamento ainda não confirmado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sale.access_released) {
      return new Response(JSON.stringify({ error: "Acesso já foi liberado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a random password
    const randomPassword = crypto.randomUUID().slice(0, 12);

    // 1. Create auth user for the client
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: client_email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { name: client_name || client_email },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: "Erro ao criar usuário: " + createErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // 2. Create slug from store name
    const slug = (store_name || "loja")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    // 3. Create tenant (store) for the client
    const { data: tenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert({
        name: store_name || "Minha Loja",
        slug,
        owner_user_id: newUserId,
      })
      .select("id")
      .single();

    if (tenantErr) {
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

    // 5. Update role to admin
    await adminClient
      .from("user_roles")
      .update({ role: "admin", tenant_id: tenant.id })
      .eq("user_id", newUserId);

    // 6. Mark sale as access released
    await adminClient
      .from("affiliate_sales")
      .update({ access_released: true, created_user_id: newUserId })
      .eq("id", sale_id);

    return new Response(
      JSON.stringify({
        success: true,
        credentials: { email: client_email, password: randomPassword },
        store_slug: slug,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
