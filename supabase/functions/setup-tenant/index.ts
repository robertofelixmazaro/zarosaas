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

    // Verify the calling user
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

    const { name, slug, phone, address, business_type } = await req.json();

    if (!name?.trim() || !slug?.trim()) {
      return new Response(JSON.stringify({ error: "Nome e slug são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a tenant
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (existingProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Usuário já possui um negócio" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve referral affiliate from user metadata
    let referredByAffiliateId: string | null = null;
    const refCode = user.user_metadata?.ref_code;
    if (refCode) {
      const { data: affiliateData } = await adminClient
        .from("affiliates")
        .select("id")
        .eq("ref_code", refCode)
        .maybeSingle();
      if (affiliateData) {
        referredByAffiliateId = affiliateData.id;
      }
    }

    // 1. Create tenant
    const tenantInsert: Record<string, any> = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      phone: phone || null,
      address: address || null,
      owner_user_id: user.id,
      niche: business_type || "other",
    };
    if (referredByAffiliateId) {
      tenantInsert.referred_by_affiliate_id = referredByAffiliateId;
    }

    const { data: tenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert(tenantInsert)
      .select("id, slug")
      .single();

    if (tenantErr) {
      const msg = tenantErr.message?.includes("duplicate") || tenantErr.message?.includes("unique")
        ? "Este slug já está em uso. Escolha outro."
        : "Erro ao criar negócio: " + tenantErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = tenant.id;

    // 2. Update profile with tenant_id
    await adminClient
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("auth_id", user.id);

    // 3. Assign admin role (update existing client role)
    const { error: roleUpdateErr } = await adminClient
      .from("user_roles")
      .update({ role: "admin", tenant_id: tenantId })
      .eq("user_id", user.id);

    // If no existing role to update, insert one
    if (roleUpdateErr) {
      await adminClient
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin", tenant_id: tenantId });
    }

    // 4. Create trial subscription with "Teste" plan
    const { data: testePlan } = await adminClient
      .from("plans")
      .select("id")
      .eq("name", "Teste")
      .eq("active", true)
      .maybeSingle();

    if (testePlan) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      await adminClient.from("subscriptions").insert({
        tenant_id: tenantId,
        plan_id: testePlan.id,
        status: "trial",
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });

      // Also set the plan_id on the tenant
      await adminClient.from("tenants").update({ plan_id: testePlan.id }).eq("id", tenantId);
    }

    // 5. Store business settings in landing_page_settings (JSON)
    const lpSettings: Record<string, string> = {
      shop_name: name.trim(),
    };
    if (phone) lpSettings.phone = phone;
    if (address) lpSettings.address = address;
    if (business_type) lpSettings.business_type = business_type;

    await adminClient.from("landing_page_settings").upsert({
      tenant_id: tenantId,
      settings: lpSettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    return new Response(
      JSON.stringify({ tenant_id: tenantId, slug: tenant.slug }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno: " + (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
