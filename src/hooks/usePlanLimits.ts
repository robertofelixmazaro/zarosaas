import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PlanLimits {
  planName: string;
  maxStaff: number;
  maxServices: number;
  maxAppointments: number;
  maxProducts: number;
  maxClients: number;
  features: string[];
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  subscriptionStatus: string;
  subscriptionBlocked: boolean;
  currentStaff: number;
  currentServices: number;
  currentMonthAppointments: number;
  currentClients: number;
  currentPeriodEnd: string | null;
  daysUntilDue: number | null;
  billingOverdue: boolean;
}

const defaultLimits: PlanLimits = {
  planName: "Teste",
  maxStaff: 1,
  maxServices: 3,
  maxAppointments: 10,
  maxProducts: 5,
  maxClients: 20,
  features: [],
  isTrial: true,
  trialEndsAt: null,
  trialExpired: false,
  subscriptionStatus: "trial",
  subscriptionBlocked: false,
  currentStaff: 0,
  currentServices: 0,
  currentMonthAppointments: 0,
  currentClients: 0,
};

export function usePlanLimits() {
  const { tenantId } = useTenant();
  const [limits, setLimits] = useState<PlanLimits>(defaultLimits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const load = async () => {
      setLoading(true);

      // Get subscription + plan
      const { data: subRaw } = await supabase
        .from("subscriptions" as any)
        .select("*, plans(*)")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      const sub = subRaw as any;

      // Count current usage
      const [staffRes, servicesRes, apptRes, clientsRes] = await Promise.all([
        supabase.from("barbers" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("active", true),
        supabase.from("services" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("active", true),
        (() => {
          const now = new Date();
          const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
          return supabase
            .from("appointments" as any)
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .gte("appointment_date", firstDay)
            .lte("appointment_date", lastDay)
            .in("status", ["pendente", "confirmado", "concluido"]);
        })(),
        supabase.from("profiles" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);

      if (!sub || !sub.plans) {
        setLimits({
          ...defaultLimits,
          currentStaff: staffRes.count || 0,
          currentServices: servicesRes.count || 0,
          currentMonthAppointments: apptRes.count || 0,
          currentClients: clientsRes.count || 0,
        });
        setLoading(false);
        return;
      }

      const plan = sub.plans as any;
      const isTrial = sub.status === "trial";
      const trialEndsAt = sub.trial_ends_at;
      const trialExpired = isTrial && trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
      const isExpiredOrCancelled = sub.status === "expired" || sub.status === "cancelled";
      const subscriptionBlocked = trialExpired || isExpiredOrCancelled;

      setLimits({
        planName: plan.name,
        maxStaff: plan.max_barbers || 999,
        maxServices: plan.max_services || 999,
        maxAppointments: plan.max_appointments_month || 99999,
        maxProducts: plan.max_products || 0,
        maxClients: plan.max_clients || 99999,
        features: plan.features || [],
        isTrial,
        trialEndsAt,
        trialExpired,
        subscriptionStatus: trialExpired ? "expired" : sub.status,
        subscriptionBlocked,
        currentStaff: staffRes.count || 0,
        currentServices: servicesRes.count || 0,
        currentMonthAppointments: apptRes.count || 0,
        currentClients: clientsRes.count || 0,
      });
      setLoading(false);
    };

    load();
  }, [tenantId]);

  const canAddStaff = () => limits.currentStaff < limits.maxStaff && !limits.subscriptionBlocked;
  const canAddService = () => limits.currentServices < limits.maxServices && !limits.subscriptionBlocked;
  const canCreateAppointment = () => limits.currentMonthAppointments < limits.maxAppointments && !limits.subscriptionBlocked;
  const canAddClient = () => limits.currentClients < limits.maxClients && !limits.subscriptionBlocked;
  const hasFeature = (feature: string) => limits.features.includes(feature);

  return { limits, loading, canAddStaff, canAddService, canCreateAppointment, canAddClient, hasFeature };
}
