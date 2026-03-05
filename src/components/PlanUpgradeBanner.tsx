import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AlertTriangle, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";

const PlanUpgradeBanner = () => {
  const { limits, loading } = usePlanLimits();
  const navigate = useNavigate();
  const { tenantSlug } = useTenant();
  const billingPath = tenantSlug ? `/t/${tenantSlug}/admin/billing` : "/admin/billing";

  if (loading) return null;

  // Cancelled subscription
  if (limits.subscriptionStatus === "cancelled") {
    return (
      <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Assinatura cancelada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sua assinatura foi cancelada. Reative para continuar criando agendamentos.
            </p>
            <Button size="sm" className="mt-3" variant="default" onClick={() => navigate(billingPath)}>
              <Crown className="h-4 w-4 mr-2" /> Reativar Plano
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired
  if (limits.trialExpired) {
    return (
      <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Período de teste expirado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Seu período de teste terminou. Escolha um plano para continuar usando a plataforma.
            </p>
            <Button size="sm" className="mt-3" variant="default" onClick={() => navigate(billingPath)}>
              <Crown className="h-4 w-4 mr-2" /> Escolher Plano
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Trial active - show countdown
  if (limits.isTrial && limits.trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(limits.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const endsFormatted = format(new Date(limits.trialEndsAt), "dd 'de' MMMM", { locale: ptBR });

    return (
      <div className="mx-4 mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              Teste grátis — {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Seu teste expira em {endsFormatted}. Aproveite para conhecer a plataforma!
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{limits.currentStaff}/{limits.maxStaff} profissionais</span>
              <span>•</span>
              <span>{limits.currentServices}/{limits.maxServices} serviços</span>
              <span>•</span>
              <span>{limits.currentMonthAppointments}/{limits.maxAppointments} agend./mês</span>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(billingPath)}>
              <Crown className="h-4 w-4 mr-2" /> Ver Planos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Approaching limits
  const staffPct = limits.maxStaff > 0 ? limits.currentStaff / limits.maxStaff : 0;
  const servicesPct = limits.maxServices > 0 ? limits.currentServices / limits.maxServices : 0;
  const apptPct = limits.maxAppointments > 0 ? limits.currentMonthAppointments / limits.maxAppointments : 0;

  if (staffPct >= 0.8 || servicesPct >= 0.8 || apptPct >= 0.8) {
    return (
      <div className="mx-4 mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Você está perto do limite do plano {limits.planName}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{limits.currentStaff}/{limits.maxStaff >= 999 ? "∞" : limits.maxStaff} profissionais</span>
              <span>•</span>
              <span>{limits.currentServices}/{limits.maxServices >= 999 ? "∞" : limits.maxServices} serviços</span>
              <span>•</span>
              <span>{limits.currentMonthAppointments}/{limits.maxAppointments >= 99999 ? "∞" : limits.maxAppointments} agend.</span>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(billingPath)}>
              <Crown className="h-4 w-4 mr-2" /> Fazer Upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PlanUpgradeBanner;
