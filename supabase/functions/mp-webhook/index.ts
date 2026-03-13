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
    const globalMpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";

    const body = await req.json();
    console.log("MP Webhook received:", JSON.stringify(body));

    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = globalMpAccessToken;

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });
    const payment = await mpRes.json();

    if (!mpRes.ok && mpRes.status === 401) {
      console.log("Global MP token failed, payment may belong to a tenant-specific account");
    }

    console.log("Payment status:", payment.status, "external_reference:", payment.external_reference);

    if (payment.status !== "approved") {
      return new Response(JSON.stringify({ ok: true, status: payment.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let refData: { plan_id: string; client_email: string; client_name: string; ref_code: string; tenant_id?: string };
    try {
      refData = JSON.parse(payment.external_reference);
    } catch {
      console.error("Failed to parse external_reference");
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Idempotency check
    const { data: existingPayment } = await adminClient
      .from("payments")
      .select("id")
      .eq("transaction_id", String(paymentId))
      .maybeSingle();

    if (existingPayment) {
      console.log("Payment already processed:", paymentId);
      return new Response(JSON.stringify({ ok: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === UPGRADE FLOW: existing tenant ===
    if (refData.tenant_id) {
      console.log("Processing UPGRADE for tenant:", refData.tenant_id);
      await processUpgrade(adminClient, refData, payment, paymentId);
      return new Response(JSON.stringify({ ok: true, processed: true, type: "upgrade" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === NEW TENANT FLOW ===
    console.log("Processing NEW TENANT creation");
    await processNewTenant(adminClient, refData, payment, paymentId);

    console.log("Payment processed successfully:", paymentId);
    return new Response(JSON.stringify({ ok: true, processed: true, type: "new_tenant" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processUpgrade(
  adminClient: ReturnType<typeof createClient>,
  refData: { plan_id: string; client_email: string; client_name: string; ref_code: string; tenant_id?: string },
  payment: any,
  paymentId: string | number
) {
  const tenantId = refData.tenant_id!;

  // 1. Update tenant plan_id
  await adminClient
    .from("tenants")
    .update({ plan_id: refData.plan_id })
    .eq("id", tenantId);

  // 2. Upsert subscription (update existing or insert new)
  const { data: existingSub } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (existingSub) {
    await adminClient
      .from("subscriptions")
      .update({
        plan_id: refData.plan_id,
        status: "active",
        payment_method: "online",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_ends_at: null,
      })
      .eq("id", existingSub.id);
  } else {
    await adminClient.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: refData.plan_id,
      status: "active",
      payment_method: "online",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
  }

  // 3. Record payment
  await adminClient.from("payments").insert({
    tenant_id: tenantId,
    plan_id: refData.plan_id,
    amount: payment.transaction_amount,
    status: "approved",
    payment_method: payment.payment_method_id || "mercadopago",
    transaction_id: String(paymentId),
  });

  // 4. Handle affiliate commission for upgrades
  await createAffiliateCommission(adminClient, tenantId, refData, payment);

  console.log("Upgrade processed for tenant:", tenantId, "to plan:", refData.plan_id);
}

async function processNewTenant(
  adminClient: ReturnType<typeof createClient>,
  refData: { plan_id: string; client_email: string; client_name: string; ref_code: string },
  payment: any,
  paymentId: string | number
) {
  const randomPassword = crypto.randomUUID().slice(0, 12);

  const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
    email: refData.client_email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { name: refData.client_name || refData.client_email },
  });

  if (createErr) {
    console.error("Error creating user:", createErr.message);
    if (!createErr.message?.includes("already been registered")) {
      throw new Error("Erro ao criar usuário");
    }
  }

  const newUserId = newUser?.user?.id;
  if (!newUserId) return;

  const slug = (refData.client_name || "loja")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const { data: tenant, error: tenantErr } = await adminClient
    .from("tenants")
    .insert({
      name: refData.client_name || "Minha Loja",
      slug,
      owner_user_id: newUserId,
      plan_id: refData.plan_id,
    })
    .select("id")
    .single();

  if (tenantErr) {
    console.error("Error creating tenant:", tenantErr.message);
    return;
  }

  // Update profile, role, payment, subscription, settings
  await adminClient.from("profiles").update({ tenant_id: tenant.id }).eq("auth_id", newUserId);
  await adminClient.from("user_roles").update({ role: "admin", tenant_id: tenant.id }).eq("user_id", newUserId);

  await adminClient.from("payments").insert({
    tenant_id: tenant.id,
    plan_id: refData.plan_id,
    amount: payment.transaction_amount,
    status: "approved",
    payment_method: payment.payment_method_id || "mercadopago",
    transaction_id: String(paymentId),
  });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await adminClient.from("subscriptions").insert({
    tenant_id: tenant.id,
    plan_id: refData.plan_id,
    status: "active",
    payment_method: "online",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_ends_at: null,
  });

  await adminClient.from("site_settings").insert([
    { key: "shop_name", value: refData.client_name || "Minha Loja", tenant_id: tenant.id },
  ]);

  // Handle affiliate commission for new tenant
  await createAffiliateCommission(adminClient, tenant.id, refData, payment);
}

async function createAffiliateCommission(
  adminClient: ReturnType<typeof createClient>,
  tenantId: string,
  refData: { plan_id: string; client_email: string; client_name: string; ref_code: string },
  payment: any
) {
  // Try ref_code from payment first, then fall back to tenant's referred_by_affiliate_id
  let affiliateId: string | null = null;
  let commissionPercent = 10;

  if (refData.ref_code) {
    const { data: affiliate } = await adminClient
      .from("affiliates")
      .select("id, commission_percent")
      .eq("ref_code", refData.ref_code)
      .maybeSingle();

    if (affiliate) {
      affiliateId = affiliate.id;
      commissionPercent = affiliate.commission_percent;
    }
  }

  // Fall back to tenant's referred_by_affiliate_id
  if (!affiliateId) {
    const { data: tenantData } = await adminClient
      .from("tenants")
      .select("referred_by_affiliate_id")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantData?.referred_by_affiliate_id) {
      const { data: affiliate } = await adminClient
        .from("affiliates")
        .select("id, commission_percent")
        .eq("id", tenantData.referred_by_affiliate_id)
        .maybeSingle();

      if (affiliate) {
        affiliateId = affiliate.id;
        commissionPercent = affiliate.commission_percent;
      }
    }
  }

  if (!affiliateId) return;

  const commissionAmount = (payment.transaction_amount * commissionPercent) / 100;

  // Get tenant name for display
  const { data: tenantInfo } = await adminClient
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: sale } = await adminClient
    .from("affiliate_sales")
    .insert({
      affiliate_id: affiliateId,
      client_email: refData.client_email,
      client_name: refData.client_name || null,
      store_name: tenantInfo?.name || "Loja",
      payment_status: "paid",
      access_released: true,
      amount: payment.transaction_amount,
      commission_amount: commissionAmount,
      plan_id: refData.plan_id,
    })
    .select("id")
    .single();

  if (sale) {
    await adminClient.from("affiliate_commissions").insert({
      affiliate_id: affiliateId,
      sale_id: sale.id,
      amount: commissionAmount,
      status: "pendente",
    });
    console.log("Affiliate commission created:", affiliateId, "amount:", commissionAmount);
  }
}
