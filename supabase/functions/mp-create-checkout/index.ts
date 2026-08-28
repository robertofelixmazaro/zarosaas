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

    const { plan_id, client_email, client_name, ref_code, tenant_id } = await req.json();

    if (!plan_id || !client_email) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey);

    // Price ALWAYS comes from the database, never from the browser
    const { data: planRow } = await adminDb
      .from("plans")
      .select("id, name, price, active")
      .eq("id", plan_id)
      .maybeSingle();

    if (!planRow || planRow.active !== true || Number(planRow.price) <= 0) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan_name = planRow.name;
    const plan_price = Number(planRow.price);

    // Resolve MP access token: tenant_secrets takes priority over global
    let mpAccessToken = globalMpAccessToken;


    if (tenant_id) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: secretData } = await adminClient
        .from("tenant_secrets")
        .select("value")
        .eq("tenant_id", tenant_id)
        .eq("key", "mercadopago_access_token")
        .maybeSingle();

      if (secretData?.value) {
        mpAccessToken = secretData.value;
      }
    }

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Mercado Pago Checkout Pro preference
    const preference = {
      items: [
        {
          title: `ZARO Agendamentos - ${plan_name || "Plano"}`,
          quantity: 1,
          unit_price: Number(plan_price),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: client_email,
        name: client_name || "",
      },
      back_urls: {
        success: tenant_id
          ? `${req.headers.get("origin") || "https://zarosaas.lovable.app"}/comprar?status=success`
          : `${req.headers.get("origin") || "https://zarosaas.lovable.app"}/cadastrar?flow=paid`,
        failure: `${req.headers.get("origin") || "https://zarosaas.lovable.app"}/comprar?status=failure`,
        pending: `${req.headers.get("origin") || "https://zarosaas.lovable.app"}/comprar?status=pending`,
      },

      auto_return: "approved",
      external_reference: JSON.stringify({
        plan_id,
        client_email,
        client_name: client_name || "",
        ref_code: ref_code || "",
        tenant_id: tenant_id || "",
      }),
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP error:", mpData);
      return new Response(JSON.stringify({ error: "Erro ao criar checkout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        checkout_url: mpData.init_point,
        preference_id: mpData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
