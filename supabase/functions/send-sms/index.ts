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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate caller uses service role
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceRoleKey) {
      // Also allow calls from other edge functions via service role
      const supabaseCheck = createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey
      );
      const { data: { user } } = await supabaseCheck.auth.getUser(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Não autorizado." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { tenant_id, to, message } = await req.json();

    if (!tenant_id || !to || !message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: tenant_id, to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // Check if SMS is enabled for this tenant
    const { data: smsSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "sms_ativo")
      .maybeSingle();

    if (!smsSetting || smsSetting.value !== "true") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "SMS desativado para esta empresa." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant Twilio credentials
    const { data: secrets } = await supabase
      .from("tenant_secrets")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["twilio_sid", "twilio_token", "twilio_phone"]);

    const secretMap: Record<string, string> = {};
    (secrets || []).forEach((s: any) => {
      secretMap[s.key] = s.value;
    });

    const { twilio_sid, twilio_token, twilio_phone } = secretMap;

    if (!twilio_sid || !twilio_token || !twilio_phone) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Credenciais Twilio não configuradas." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    let phone = to.replace(/\D/g, "");
    if (!phone.startsWith("55")) {
      phone = "55" + phone;
    }
    phone = "+" + phone;

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilio_sid}/Messages.json`;
    const basicAuth = btoa(`${twilio_sid}:${twilio_token}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: twilio_phone,
        Body: message,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", JSON.stringify(twilioData));
      return new Response(
        JSON.stringify({ error: "Falha ao enviar SMS.", details: twilioData.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send SMS error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao enviar SMS." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
