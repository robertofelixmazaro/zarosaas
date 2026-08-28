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

    const { name, slug, phone, address, business_type, payment_id } = await req.json();

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

    // === Contracting flow guard ===
    // Trial availability is defined by the "Teste" plan being active (admin setting).
    const { data: testePlan } = await adminClient
      .from("plans")
      .select("id")
      .eq("name", "Teste")
      .eq("active", true)
      .maybeSingle();

    const trialEnabled = !!testePlan;

    // Paid flow: a confirmed Mercado Pago payment is required
    let paidSignup: any = null;
    if (payment_id) {
      const { data: ps } = await adminClient
        .from("paid_signups")
        .select("*")
        .eq("transaction_id", String(payment_id))
        .maybeSingle();

      if (!ps || ps.status !== "approved" || ps.consumed_at) {
        return new Response(JSON.stringify({ error: "Pagamento não confirmado" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      paidSignup = ps;
    }

    if (!paidSignup && !trialEnabled) {
      return new Response(JSON.stringify({ error: "É necessário concluir o pagamento antes de criar a conta" }), {
        status: 402,
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

    // 4. Activate subscription: paid plan (confirmed payment) or free trial
    if (paidSignup) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await adminClient.from("subscriptions").insert({
        tenant_id: tenantId,
        plan_id: paidSignup.plan_id,
        status: "active",
        payment_method: "online",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_ends_at: null,
      });

      await adminClient.from("tenants").update({ plan_id: paidSignup.plan_id }).eq("id", tenantId);

      await adminClient.from("payments").insert({
        tenant_id: tenantId,
        plan_id: paidSignup.plan_id,
        amount: paidSignup.amount,
        status: "approved",
        payment_method: paidSignup.payment_method || "mercadopago",
        transaction_id: String(paidSignup.transaction_id),
      });

      await adminClient
        .from("paid_signups")
        .update({ consumed_at: new Date().toISOString(), tenant_id: tenantId })
        .eq("id", paidSignup.id);

      // Affiliate commission for the confirmed sale
      const affRefCode = paidSignup.ref_code || refCode || null;
      if (affRefCode) {
        const { data: affiliate } = await adminClient
          .from("affiliates")
          .select("id, commission_percent")
          .eq("ref_code", affRefCode)
          .maybeSingle();

        if (affiliate) {
          const commissionAmount = (Number(paidSignup.amount) * Number(affiliate.commission_percent)) / 100;
          const { data: sale } = await adminClient
            .from("affiliate_sales")
            .insert({
              affiliate_id: affiliate.id,
              client_email: paidSignup.email,
              client_name: paidSignup.name || null,
              store_name: name.trim(),
              payment_status: "paid",
              access_released: true,
              amount: paidSignup.amount,
              commission_amount: commissionAmount,
              plan_id: paidSignup.plan_id,
              created_user_id: user.id,
            })
            .select("id")
            .single();

          if (sale) {
            await adminClient.from("affiliate_commissions").insert({
              affiliate_id: affiliate.id,
              sale_id: sale.id,
              amount: commissionAmount,
              status: "pendente",
            });
          }

          if (!referredByAffiliateId) {
            await adminClient
              .from("tenants")
              .update({ referred_by_affiliate_id: affiliate.id })
              .eq("id", tenantId);
          }
        }
      }
    } else if (testePlan) {
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
