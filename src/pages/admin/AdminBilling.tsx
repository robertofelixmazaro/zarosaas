import { useEffect, useState } from "react";
import { CreditCard, Crown, AlertTriangle, CheckCircle, Clock, ArrowUpCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  max_barbers: number | null;
  max_services: number | null;
  max_appointments_month: number | null;
  max_products: number | null;
  features: any;
  active: boolean;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  created_at: string;
  plans?: { name: string };
}

const AdminBilling = () => {
  const { tenantId } = useTenant();
  const { limits, loading: limitsLoading } = usePlanLimits();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    const [plansRes, paymentsRes, subRes] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("price", { ascending: true }),
      supabase.from("payments" as any).select("*, plans(name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("subscriptions" as any).select("*, plans(*)").eq("tenant_id", tenantId).maybeSingle(),
    ]);
    if (plansRes.data) setPlans(plansRes.data as any);
    if (paymentsRes.data) setPayments(paymentsRes.data as any);
    if (subRes.data) setSubscription(subRes.data as any);
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!tenantId) return;
    setUpgrading(true);
    try {
      // Get current user email/name for checkout
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Não foi possível identificar seu email. Faça login novamente.");
        setUpgrading(false);
        return;
      }

      // Create Mercado Pago checkout session
      const { data, error } = await supabase.functions.invoke("mp-create-checkout", {
        body: {
          plan_id: plan.id,
          plan_name: plan.name,
          plan_price: plan.price,
          client_email: user.email,
          client_name: user.user_metadata?.name || user.email,
          tenant_id: tenantId,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Erro ao criar sessão de pagamento");
        setUpgrading(false);
        return;
      }

      // Redirect to Mercado Pago checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error("Erro ao processar pagamento");
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    try {
      await supabase.from("subscriptions" as any).update({ status: "cancelled" } as any).eq("id", subscription.id);
      toast.success("Assinatura cancelada");
      setCancelOpen(false);
      loadData();
    } catch {
      toast.error("Erro ao cancelar");
    }
  };

  const currentPlan = subscription?.plans as Plan | null;
  const isTrial = subscription?.status === "trial";
  const isActive = subscription?.status === "active";
  const isCancelled = subscription?.status === "cancelled";
  const isExpired = limits.trialExpired;

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const statusBadge = () => {
    if (isExpired) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expirado</Badge>;
    if (isCancelled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
    if (isTrial) return <Badge className="gap-1 bg-warning text-warning-foreground"><Clock className="h-3 w-3" /> Teste Grátis</Badge>;
    if (isActive) return <Badge className="gap-1 bg-green-600 text-white"><CheckCircle className="h-3 w-3" /> Ativo</Badge>;
    return <Badge variant="secondary">Sem plano</Badge>;
  };

  const paymentStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-600 text-white">Aprovado</Badge>;
      case "pending": return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      case "failed": return <Badge variant="destructive">Falhou</Badge>;
      case "refunded": return <Badge variant="secondary">Reembolsado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plano Atual</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {currentPlan?.name || limits.planName}
            </CardTitle>
          </CardHeader>
          <CardContent>{statusBadge()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor Mensal</CardDescription>
            <CardTitle className="text-2xl">
              {currentPlan?.price ? `R$ ${Number(currentPlan.price).toFixed(2)}` : "Grátis"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">por mês</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isTrial ? "Trial expira em" : "Próxima cobrança"}</CardDescription>
            <CardTitle className="text-2xl">
              {isTrial
                ? `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""}`
                : subscription?.current_period_end
                  ? format(new Date(subscription.current_period_end), "dd/MM/yyyy")
                  : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isExpired && <span className="text-sm text-destructive font-medium">Trial expirado! Faça upgrade.</span>}
          </CardContent>
        </Card>
      </div>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Profissionais</p>
              <p className="text-lg font-semibold">{limits.currentStaff} / {limits.maxStaff >= 999 ? "∞" : limits.maxStaff}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Serviços</p>
              <p className="text-lg font-semibold">{limits.currentServices} / {limits.maxServices >= 999 ? "∞" : limits.maxServices}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Agendamentos (mês)</p>
              <p className="text-lg font-semibold">{limits.currentMonthAppointments} / {limits.maxAppointments >= 99999 ? "∞" : limits.maxAppointments}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setUpgradeOpen(true)} className="gap-2">
          <ArrowUpCircle className="h-4 w-4" /> Fazer Upgrade
        </Button>
        {isActive && (
          <Button variant="outline" onClick={() => setCancelOpen(true)} className="gap-2 text-destructive">
            <XCircle className="h-4 w-4" /> Cancelar Assinatura
          </Button>
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" /> Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pagamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>{(p as any).plans?.name || "—"}</TableCell>
                    <TableCell>R$ {Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{p.payment_method}</TableCell>
                    <TableCell>{paymentStatusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escolha seu Plano</DialogTitle>
            <DialogDescription>Selecione o plano ideal para o seu negócio</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.filter(p => p.price > 0).map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const features = Array.isArray(plan.features) ? plan.features : [];
              return (
                <Card key={plan.id} className={`relative ${isCurrent ? "border-primary" : ""}`}>
                  {isCurrent && <Badge className="absolute -top-2 right-3 bg-primary">Atual</Badge>}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-2xl font-bold mt-2">R$ {Number(plan.price).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>✓ {plan.max_barbers && plan.max_barbers >= 999 ? "Ilimitado" : plan.max_barbers} profissionais</li>
                      <li>✓ {plan.max_services && plan.max_services >= 999 ? "Ilimitado" : plan.max_services} serviços</li>
                      <li>✓ {plan.max_appointments_month && plan.max_appointments_month >= 99999 ? "Ilimitado" : plan.max_appointments_month} agendamentos/mês</li>
                      {features.map((f: string, i: number) => <li key={i}>✓ {f}</li>)}
                    </ul>
                    <Button
                      className="w-full"
                      disabled={isCurrent || upgrading}
                      onClick={() => handleUpgrade(plan)}
                    >
                      {isCurrent ? "Plano Atual" : upgrading ? "Processando..." : "Selecionar Plano"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar? Você perderá acesso às funcionalidades do plano ao final do período.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Confirmar Cancelamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBilling;
