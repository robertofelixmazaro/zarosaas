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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all active subscriptions with their tenant owners
    const { data: subs, error: subsErr } = await adminClient
      .from("subscriptions")
      .select("id, tenant_id, status, current_period_end, plan_id, tenants(name, owner_user_id)")
      .in("status", ["active", "trial"])
      .not("current_period_end", "is", null);

    if (subsErr) {
      console.error("Error fetching subscriptions:", subsErr);
      throw subsErr;
    }

    const now = new Date();
    let notificationCount = 0;

    for (const sub of (subs || [])) {
      const tenant = (sub as any).tenants;
      if (!tenant?.owner_user_id) continue;

      const periodEnd = new Date(sub.current_period_end!);
      const diffMs = periodEnd.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let message: string | null = null;
      const dueDate = periodEnd.toLocaleDateString("pt-BR");

      if (daysUntilDue === 5) {
        message = `Seu plano vence em 5 dias. Realize o pagamento até ${dueDate} para evitar bloqueio.`;
      } else if (daysUntilDue === 2) {
        message = `Seu plano vence em 2 dias. Evite interrupções realizando o pagamento.`;
      } else if (daysUntilDue === 0) {
        message = `Seu plano vence hoje. Efetue o pagamento para continuar utilizando o sistema.`;
      } else if (daysUntilDue < 0 && daysUntilDue >= -1) {
        message = `Seu plano está vencido. Regularize para continuar utilizando o sistema.`;
      }

      if (!message) continue;

      // Check if notification already sent today for this user
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const { data: existing } = await adminClient
        .from("user_notifications")
        .select("id")
        .eq("user_id", tenant.owner_user_id)
        .gte("created_at", todayStart)
        .ilike("message_text", `%plano vence%`)
        .maybeSingle();

      if (existing) continue;

      // Insert notification
      await adminClient.from("user_notifications").insert({
        user_id: tenant.owner_user_id,
        message_text: message,
        message_status: "sent",
      });

      notificationCount++;
      console.log(`Notification sent to tenant ${sub.tenant_id}: ${message}`);
    }

    return new Response(
      JSON.stringify({ ok: true, notifications_sent: notificationCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
