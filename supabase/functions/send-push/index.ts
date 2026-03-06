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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tenant_id, title, body, url, tag } = await req.json();

    if (!tenant_id || !title) {
      return new Response(
        JSON.stringify({ error: "tenant_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active push subscriptions for this tenant's admin
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No active subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || `/t/admin/agendamentos`,
      tag: tag || "appointment-notification",
      icon: "/icon-192.png",
    });

    // Import web-push compatible library for Deno
    const { importPKCS8, SignJWT } = await import("https://deno.land/x/jose@v5.2.0/index.ts");

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Build JWT for VAPID
        const privateKeyPem = `-----BEGIN EC PRIVATE KEY-----\n${vapidPrivateKey}\n-----END EC PRIVATE KEY-----`;
        
        const endpoint = new URL(sub.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;

        const ecPrivateKey = await importPKCS8(privateKeyPem, "ES256");
        const jwt = await new SignJWT({})
          .setProtectedHeader({ alg: "ES256" })
          .setAudience(audience)
          .setSubject("mailto:noreply@zaro.app")
          .setExpirationTime("24h")
          .sign(ecPrivateKey);

        // Create the raw push body
        // For simplicity we send plain text payload using fetch with VAPID headers
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: payload,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          failed.push(sub.endpoint);
        } else {
          failed.push(sub.endpoint);
        }
      } catch (pushErr) {
        console.error("Push send error:", pushErr);
        failed.push(sub.endpoint);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed: failed.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send push error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao enviar notificação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
