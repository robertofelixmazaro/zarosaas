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
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const body = await req.json();
    console.log("MP Webhook received:", JSON.stringify(body));

    // Mercado Pago sends notifications with type "payment"
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

    // Fetch payment details from Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });
    const payment = await mpRes.json();

    console.log("Payment status:", payment.status, "external_reference:", payment.external_reference);

    if (payment.status !== "approved") {
      return new Response(JSON.stringify({ ok: true, status: payment.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse external_reference
    let refData: { plan_id: string; client_email: string; client_name: string; ref_code: string };
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

    // Check if this payment was already processed (idempotency)
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

    // Generate password
    const randomPassword = crypto.randomUUID().slice(0, 12);

    // 1. Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: refData.client_email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { name: refData.client_name || refData.client_email },
    });

    if (createErr) {
      console.error("Error creating user:", createErr.message);
      // User might already exist - that's ok
      if (!createErr.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "Erro ao criar usuário" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const newUserId = newUser?.user?.id;

    if (newUserId) {
      // 2. Create store slug
      const slug = (refData.client_name || "loja")
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
          name: refData.client_name || "Minha Loja",
          slug,
          owner_user_id: newUserId,
          plan_id: refData.plan_id,
        })
        .select("id")
        .single();

      if (tenantErr) {
        console.error("Error creating tenant:", tenantErr.message);
      } else {
        // 4. Update profile
        await adminClient
          .from("profiles")
          .update({ tenant_id: tenant.id })
          .eq("auth_id", newUserId);

        // 5. Update role
        await adminClient
          .from("user_roles")
          .update({ role: "admin", tenant_id: tenant.id })
          .eq("user_id", newUserId);

        // 6. Record payment
        await adminClient.from("payments").insert({
          tenant_id: tenant.id,
          plan_id: refData.plan_id,
          amount: payment.transaction_amount,
          status: "approved",
          payment_method: payment.payment_method_id || "mercadopago",
          transaction_id: String(paymentId),
        });

        // 7. Create subscription
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        
        await adminClient.from("subscriptions").insert({
          tenant_id: tenant.id,
          plan_id: refData.plan_id,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });

        // 8. Initialize site settings
        await adminClient.from("site_settings").insert([
          { key: "shop_name", value: refData.client_name || "Minha Loja", tenant_id: tenant.id },
        ]);
      }

      // 9. Handle affiliate commission
      if (refData.ref_code) {
        const { data: affiliate } = await adminClient
          .from("affiliates")
          .select("id, commission_percent")
          .eq("ref_code", refData.ref_code)
          .maybeSingle();

        if (affiliate) {
          const commissionAmount = (payment.transaction_amount * affiliate.commission_percent) / 100;

          // Record sale
          const { data: sale } = await adminClient
            .from("affiliate_sales")
            .insert({
              affiliate_id: affiliate.id,
              client_email: refData.client_email,
              client_name: refData.client_name || null,
              store_name: refData.client_name || "Minha Loja",
              payment_status: "paid",
              access_released: true,
              created_user_id: newUserId,
              amount: payment.transaction_amount,
              commission_amount: commissionAmount,
              plan_id: refData.plan_id,
            })
            .select("id")
            .single();

          // Record commission
          if (sale) {
            await adminClient
              .from("affiliate_commissions")
              .insert({
                affiliate_id: affiliate.id,
                sale_id: sale.id,
                amount: commissionAmount,
                status: "pendente",
              });
          }
        }
      }
    }

    console.log("Payment processed successfully:", paymentId);
    return new Response(JSON.stringify({ ok: true, processed: true }), {
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
