import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Free trial availability is controlled by the "Teste" plan being active
 * in the platform admin (Planos). Active = trial enabled.
 */
export const useTrialEnabled = () => {
  const [trialEnabled, setTrialEnabled] = useState<boolean | null>(null);
  const [trialPlan, setTrialPlan] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("plans")
      .select("*")
      .eq("name", "Teste")
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setTrialPlan(data ?? null);
        setTrialEnabled(!!data);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { trialEnabled, trialPlan, loading: trialEnabled === null };
};
