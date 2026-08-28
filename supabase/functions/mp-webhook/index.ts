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
  // Payment approved for a NEW customer: do NOT create the account here.
  // Store the confirmed payment so the "Crie sua conta" page can be unlocked
  // and the paid plan activated when the user finishes the signup.
  const { error: insertErr } = await adminClient.from("paid_signups").insert({
    transaction_id: String(paymentId),
    plan_id: refData.plan_id,
    email: refData.client_email,
    name: refData.client_name || null,
    ref_code: refData.ref_code || null,
    amount: payment.transaction_amount,
    payment_method: payment.payment_method_id || "mercadopago",
    status: "approved",
  });

  if (insertErr && !insertErr.message?.includes("duplicate")) {
    console.error("Error storing paid signup:", insertErr.message);
    return;
  }

  console.log("Paid signup stored, awaiting account creation:", refData.client_email);
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
