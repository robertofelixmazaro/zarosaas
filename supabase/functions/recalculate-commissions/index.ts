import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get all affiliates
    const { data: affiliates, error: affErr } = await adminClient
      .from("affiliates")
      .select("id, user_id, commission_percent, ref_code");
    if (affErr) throw affErr;
    if (!affiliates?.length) return jsonResp({ message: "No affiliates found", processed: 0 });

    // 2. Get all tenants that were referred by an affiliate
    const { data: tenants, error: tenErr } = await adminClient
      .from("tenants")
      .select("id, name, slug, referred_by_affiliate_id, owner_user_id")
      .not("referred_by_affiliate_id", "is", null);
    if (tenErr) throw tenErr;

    // 3. Get all subscriptions for referred tenants
    const tenantIds = (tenants || []).map((t) => t.id);
    let subscriptions: any[] = [];
    if (tenantIds.length > 0) {
      const { data: subs } = await adminClient
        .from("subscriptions")
        .select("tenant_id, status, plan_id")
        .in("tenant_id", tenantIds);
      subscriptions = subs || [];
    }

    // 4. Get plans for price info
    const { data: plans } = await adminClient.from("plans").select("id, price, name");
    const planMap: Record<string, { price: number; name: string }> = {};
    (plans || []).forEach((p) => { planMap[p.id] = { price: p.price, name: p.name }; });

    // Build subscription status map by tenant
    const subMap: Record<string, { status: string; plan_id: string }> = {};
    subscriptions.forEach((s) => { subMap[s.tenant_id] = { status: s.status, plan_id: s.plan_id }; });

    const results: any[] = [];
    const alerts: any[] = [];

    for (const affiliate of affiliates) {
      const referredTenants = (tenants || []).filter(
        (t) => t.referred_by_affiliate_id === affiliate.id
      );

      let activeClients = 0;
      let cancelledClients = 0;
      let monthlyCommission = 0;
      const clientDetails: any[] = [];

      for (const tenant of referredTenants) {
        const sub = subMap[tenant.id];
        const status = sub?.status || "no_subscription";
        const plan = sub?.plan_id ? planMap[sub.plan_id] : null;
        const isActive = status === "active";

        if (isActive) {
          activeClients++;
          const commission = plan ? (plan.price * affiliate.commission_percent) / 100 : 0;
          monthlyCommission += commission;
        } else {
          cancelledClients++;
          // Generate alert for cancelled/past_due clients
          if (["cancelled", "past_due", "expired"].includes(status)) {
            alerts.push({
              affiliate_name: affiliate.ref_code,
              affiliate_id: affiliate.id,
              tenant_name: tenant.name,
              tenant_id: tenant.id,
              status,
            });
          }
        }

        clientDetails.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          status,
          plan: plan?.name || "—",
          commission: isActive && plan ? (plan.price * affiliate.commission_percent) / 100 : 0,
        });
      }

      results.push({
        affiliate_id: affiliate.id,
        ref_code: affiliate.ref_code,
        commission_percent: affiliate.commission_percent,
        active_clients: activeClients,
        cancelled_clients: cancelledClients,
        monthly_commission: Math.round(monthlyCommission * 100) / 100,
        clients: clientDetails,
      });
    }

    console.log(`Recalculated commissions for ${results.length} affiliates, ${alerts.length} alerts`);

    return jsonResp({
      success: true,
      processed: results.length,
      results,
      alerts,
      calculated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Recalculate commissions error:", err);
    return jsonResp({ error: "Erro interno do servidor" }, 500);
  }
});
