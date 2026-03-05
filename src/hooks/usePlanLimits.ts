import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PlanLimits {
  planName: string;
  maxStaff: number;
  maxServices: number;
  maxAppointments: number;
  maxProducts: number;
  features: string[];
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  subscriptionStatus: string;
  currentStaff: number;
  currentServices: number;
  currentMonthAppointments: number;
}

const defaultLimits: PlanLimits = {
  planName: "Teste Grátis",
  maxStaff: 1,
  maxServices: 3,
  maxAppointments: 50,
  maxProducts: 0,
  features: [],
  isTrial: true,
  trialEndsAt: null,
  trialExpired: false,
  subscriptionStatus: "trial",
  currentStaff: 0,
  currentServices: 0,
  currentMonthAppointments: 0,
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
      const [staffRes, servicesRes, apptRes] = await Promise.all([
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
      ]);

      if (!sub || !sub.plans) {
        // No subscription yet — use default trial limits
        setLimits({
          ...defaultLimits,
          currentStaff: staffRes.count || 0,
          currentServices: servicesRes.count || 0,
          currentMonthAppointments: apptRes.count || 0,
        });
        setLoading(false);
        return;
      }

      const plan = sub.plans as any;
      const isTrial = sub.status === "trial";
      const trialEndsAt = sub.trial_ends_at;
      const trialExpired = isTrial && trialEndsAt ? new Date(trialEndsAt) < new Date() : false;

      setLimits({
        planName: plan.name,
        maxStaff: plan.max_barbers || 999,
        maxServices: plan.max_services || 999,
        maxAppointments: plan.max_appointments_month || 99999,
        maxProducts: plan.max_products || 0,
        features: plan.features || [],
        isTrial,
        trialEndsAt,
        trialExpired,
        subscriptionStatus: trialExpired ? "expired" : sub.status,
        currentStaff: staffRes.count || 0,
        currentServices: servicesRes.count || 0,
        currentMonthAppointments: apptRes.count || 0,
      });
      setLoading(false);
    };

    load();
  }, [tenantId]);

  const canAddStaff = () => limits.currentStaff < limits.maxStaff && !limits.trialExpired;
  const canAddService = () => limits.currentServices < limits.maxServices && !limits.trialExpired;
  const canCreateAppointment = () => limits.currentMonthAppointments < limits.maxAppointments && !limits.trialExpired;
  const hasFeature = (feature: string) => limits.features.includes(feature);

  return { limits, loading, canAddStaff, canAddService, canCreateAppointment, hasFeature };
}
