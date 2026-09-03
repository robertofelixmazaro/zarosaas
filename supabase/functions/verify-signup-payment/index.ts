import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body allowed */ }
    const payment_id = body?.payment_id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const respond = async (row: any) => {
      if (!row) return json({ approved: false, reason: "not_found" });
      if (row.consumed_at || row.tenant_id) return json({ approved: false, reason: "already_used" });
      const { data: plan } = await admin
        .from("plans")
        .select("id, name, price")
        .eq("id", row.plan_id)
        .maybeSingle();
      return json({
        approved: true,
        payment_id: row.transaction_id,
        plan_id: row.plan_id,
        plan_name: plan?.name ?? null,
        plan_price: plan?.price ?? null,
        email: row.email,
        name: row.name,
      });
    };

    // No payment_id: recover the payment of the authenticated user by e-mail.
    // This keeps the payment reference alive across OAuth redirects without
    // ever trusting a browser-supplied identifier.
    if (!payment_id) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ approved: false, reason: "missing_payment_id" }, 400);

      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      const email = (user?.email || "").trim().toLowerCase();
      if (!email) return json({ approved: false, reason: "unauthenticated" }, 401);

      const { data: byEmail } = await admin
        .from("paid_signups")
        .select("*")
        .ilike("email", email)
        .eq("status", "approved")
        .is("consumed_at", null)
        .is("tenant_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return await respond(byEmail);
    }

    // 1. Trust the webhook-confirmed record first
    const { data: existing } = await admin
      .from("paid_signups")
      .select("*")
      .eq("transaction_id", String(payment_id))
      .maybeSingle();

    if (existing) return await respond(existing);


    // 2. Webhook may not have arrived yet: confirm directly with Mercado Pago
    if (!mpAccessToken) return json({ approved: false, reason: "pending" });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });
    const payment = await mpRes.json();

    if (!mpRes.ok || payment.status !== "approved") {
      return json({ approved: false, reason: "not_approved", status: payment?.status ?? null });
    }

    let refData: any = {};
    try {
      refData = JSON.parse(payment.external_reference || "{}");
    } catch {
      return json({ approved: false, reason: "invalid_reference" });
    }

    // Upgrades of existing tenants are not signup payments
    if (refData.tenant_id) return json({ approved: false, reason: "not_a_signup_payment" });
    if (!refData.plan_id || !refData.client_email) return json({ approved: false, reason: "invalid_reference" });

    await admin.from("paid_signups").insert({
      transaction_id: String(payment_id),
      plan_id: refData.plan_id,
      email: refData.client_email,
      name: refData.client_name || null,
      ref_code: refData.ref_code || null,
      amount: payment.transaction_amount,
      payment_method: payment.payment_method_id || "mercadopago",
      status: "approved",
    });

    const { data: stored } = await admin
      .from("paid_signups")
      .select("*")
      .eq("transaction_id", String(payment_id))
      .maybeSingle();

    return await respond(stored);
  } catch (err) {
    console.error("verify-signup-payment error:", err);
    return json({ approved: false, reason: "error" }, 500);
  }
});
