import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2, Users, CreditCard, TrendingUp, DollarSign, Clock,
  Filter, AlertTriangle, Eye, Ban, XCircle, CheckCircle, CalendarCheck,
  BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const formatMonthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return `${MONTH_LABELS[parseInt(mo) - 1]}/${y.slice(2)}`;
};

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  active: boolean;
  plan_id: string | null;
  created_at: string | null;
}

interface SubRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  payment_method: string;
}

interface PlanRow {
  id: string;
  name: string;
  price: number;
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  amount: number;
  status: string;
  created_at: string | null;
}

const PlatformDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);

  // Filters
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Action dialogs
  const [actionTenant, setActionTenant] = useState<TenantRow | null>(null);
  const [actionType, setActionType] = useState<"block" | "cancel" | "plan" | "payment" | null>(null);
  const [actionPlanId, setActionPlanId] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tRes, sRes, pRes, plRes] = await Promise.all([
      supabase.from("tenants").select("id, name, slug, city, active, plan_id, created_at").order("created_at", { ascending: false }),
      supabase.from("subscriptions" as any).select("id, tenant_id, plan_id, status, current_period_end, trial_ends_at, payment_method"),
      supabase.from("payments" as any).select("id, tenant_id, amount, status, created_at"),
      supabase.from("plans").select("id, name, price"),
    ]);
    setTenants((tRes.data || []) as any);
    setSubscriptions((sRes.data || []) as any);
    setPayments((pRes.data || []) as any);
    setPlans((plRes.data || []) as any);
    setLoading(false);
  };

  // Build lookup maps
  const subsMap = useMemo(() => {
    const m: Record<string, SubRow> = {};
    subscriptions.forEach(s => { m[s.tenant_id] = s; });
    return m;
  }, [subscriptions]);

  const planMap = useMemo(() => {
    const m: Record<string, PlanRow> = {};
    plans.forEach(p => { m[p.id] = p; });
    return m;
  }, [plans]);

  // Derive status for each tenant
  const getTenantStatus = (t: TenantRow): "active" | "trial" | "expired" | "cancelled" => {
    const sub = subsMap[t.id];
    if (!sub) return "expired";
    if (sub.status === "cancelled") return "cancelled";
    if (sub.status === "trial") {
      if (sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) return "expired";
      return "trial";
    }
    if (sub.status === "expired") return "expired";
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return "expired";
    return "active";
  };

  // Cities
  const cities = useMemo(() => {
    const c = new Set(tenants.map(t => t.city).filter(Boolean) as string[]);
    return Array.from(c).sort();
  }, [tenants]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const status = getTenantStatus(t);
      const sub = subsMap[t.id];
      if (filterStatus !== "all" && status !== filterStatus) return false;
      if (filterPlan !== "all" && (sub?.plan_id || t.plan_id) !== filterPlan) return false;
      if (filterCity !== "all" && t.city !== filterCity) return false;
      if (dateFrom && t.created_at && t.created_at.substring(0, 10) < dateFrom) return false;
      if (dateTo && t.created_at && t.created_at.substring(0, 10) > dateTo) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tenants, subsMap, filterStatus, filterPlan, filterCity, dateFrom, dateTo, search]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let active = 0, trial = 0, expired = 0, cancelled = 0;
    tenants.forEach(t => {
      const s = getTenantStatus(t);
      if (s === "active") active++;
      else if (s === "trial") trial++;
      else if (s === "expired") expired++;
      else if (s === "cancelled") cancelled++;
    });

    const mrr = payments
      .filter(p => p.status === "approved" && p.created_at?.substring(0, 7) === thisMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRevenue = payments
      .filter(p => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingPayments = payments.filter(p => p.status === "pending").length;

    return { active, trial, expired, cancelled, mrr, totalRevenue, pendingPayments };
  }, [tenants, payments, subscriptions]);

  // Due in next 7 days
  const dueSoon = useMemo(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tenants.filter(t => {
      const sub = subsMap[t.id];
      if (!sub?.current_period_end) return false;
      const end = new Date(sub.current_period_end);
      return end >= now && end <= in7days;
    });
  }, [tenants, subsMap]);

  // Charts
  const charts = useMemo(() => {
    const tenantsByMonth: Record<string, number> = {};
    tenants.forEach(t => {
      if (!t.created_at) return;
      const m = t.created_at.substring(0, 7);
      tenantsByMonth[m] = (tenantsByMonth[m] || 0) + 1;
    });

    const revenueByMonth: Record<string, number> = {};
    payments.filter(p => p.status === "approved").forEach(p => {
      if (!p.created_at) return;
      const m = p.created_at.substring(0, 7);
      revenueByMonth[m] = (revenueByMonth[m] || 0) + Number(p.amount);
    });

    const toArr = (map: Record<string, number>, key: string) =>
      Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, val]) => ({ month, label: formatMonthLabel(month), [key]: val }));

    return {
      tenants: toArr(tenantsByMonth, "count"),
      revenue: toArr(revenueByMonth, "amount"),
    };
  }, [tenants, payments]);

  // Actions
  const handleBlock = async () => {
    if (!actionTenant) return;
    setActionSaving(true);
    await supabase.from("tenants").update({ active: !actionTenant.active } as any).eq("id", actionTenant.id);
    toast.success(actionTenant.active ? "Conta bloqueada" : "Conta desbloqueada");
    setActionType(null);
    setActionSaving(false);
    loadData();
  };

  const handleCancel = async () => {
    if (!actionTenant) return;
    setActionSaving(true);
    const sub = subsMap[actionTenant.id];
    if (sub) {
      await supabase.from("subscriptions" as any).update({ status: "cancelled" } as any).eq("id", sub.id);
    }
    toast.success("Assinatura cancelada");
    setActionType(null);
    setActionSaving(false);
    loadData();
  };

  const handleChangePlan = async () => {
    if (!actionTenant || !actionPlanId) return;
    setActionSaving(true);
    const sub = subsMap[actionTenant.id];
    await supabase.from("tenants").update({ plan_id: actionPlanId } as any).eq("id", actionTenant.id);
    if (sub) {
      await supabase.from("subscriptions" as any).update({ plan_id: actionPlanId } as any).eq("id", sub.id);
    }
    toast.success("Plano alterado");
    setActionType(null);
    setActionSaving(false);
    loadData();
  };

  const handleManualPayment = async () => {
    if (!actionTenant) return;
    setActionSaving(true);
    const sub = subsMap[actionTenant.id];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (sub) {
      await supabase.from("subscriptions" as any).update({
        status: "active",
        payment_method: "manual",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_ends_at: null,
      } as any).eq("id", sub.id);
    } else {
      await supabase.from("subscriptions" as any).insert({
        tenant_id: actionTenant.id,
        plan_id: actionTenant.plan_id,
        status: "active",
        payment_method: "manual",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      } as any);
    }

    await supabase.from("payments" as any).insert({
      tenant_id: actionTenant.id,
      plan_id: sub?.plan_id || actionTenant.plan_id,
      amount: planMap[sub?.plan_id || actionTenant.plan_id || ""]?.price || 0,
      status: "approved",
      payment_method: "manual",
      transaction_id: `manual-${Date.now()}`,
    } as any);

    toast.success("Pagamento manual confirmado — plano renovado por 30 dias");
    setActionType(null);
    setActionSaving(false);
    loadData();
  };

  const statusBadge = (status: "active" | "trial" | "expired" | "cancelled") => {
    switch (status) {
      case "active": return <Badge className="bg-green-600 text-white">Ativo</Badge>;
      case "trial": return <Badge className="bg-amber-500 text-white">Trial</Badge>;
      case "expired": return <Badge variant="destructive">Vencido</Badge>;
      case "cancelled": return <Badge variant="secondary">Cancelado</Badge>;
    }
  };

  const hasFilters = filterPlan !== "all" || filterStatus !== "all" || filterCity !== "all" || dateFrom || dateTo || search;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Clientes Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{metrics.active}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Em Trial</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{metrics.trial}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Vencidos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{metrics.expired}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Cancelados</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{metrics.cancelled}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">MRR (Receita Mensal)</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">R$ {metrics.mrr.toFixed(2)}</p></CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Novos Clientes / Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.tenants}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Clientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Receita Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={charts.revenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]} />
                    <Area type="monotone" dataKey="amount" name="Receita" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Due Soon */}
          {dueSoon.length > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Vencimento nos próximos 7 dias ({dueSoon.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dueSoon.map(t => {
                    const sub = subsMap[t.id];
                    const plan = planMap[sub?.plan_id || t.plan_id || ""];
                    const dueDate = sub?.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy") : "—";
                    return (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{plan?.name || "Sem plano"} · Vence {dueDate}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => {
                          setActionTenant(t);
                          setActionType("payment");
                        }}>
                          <CreditCard className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros</span>
                </div>
                <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Plano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Planos</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Cidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Cidades</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
                </div>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSearch(""); setFilterStatus("all"); setFilterPlan("all"); setFilterCity("all"); setDateFrom(""); setDateTo("");
                  }}>Limpar</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenants Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Empresas Cadastradas ({filteredTenants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma empresa encontrada
                        </TableCell>
                      </TableRow>
                    ) : filteredTenants.map(t => {
                      const sub = subsMap[t.id];
                      const plan = planMap[sub?.plan_id || t.plan_id || ""];
                      const status = getTenantStatus(t);
                      const dueDate = sub?.current_period_end
                        ? format(new Date(sub.current_period_end), "dd/MM/yyyy")
                        : sub?.trial_ends_at
                          ? format(new Date(sub.trial_ends_at), "dd/MM/yyyy")
                          : "—";

                      return (
                        <TableRow key={t.id} className={!t.active ? "opacity-50" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>{plan?.name || "Sem plano"}</TableCell>
                          <TableCell>{statusBadge(status)}</TableCell>
                          <TableCell className="text-sm">{dueDate}</TableCell>
                          <TableCell>{plan ? `R$ ${plan.price.toFixed(2)}` : "—"}</TableCell>
                          <TableCell className="text-sm">{t.city || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {t.created_at ? format(new Date(t.created_at), "dd/MM/yy") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" title="Ver loja" asChild>
                                <a href={getTenantExternalUrl(t.slug)} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button size="icon" variant="ghost" title="Alterar plano" onClick={() => {
                                setActionTenant(t);
                                setActionPlanId(sub?.plan_id || t.plan_id || "");
                                setActionType("plan");
                              }}>
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title="Pagamento manual" onClick={() => {
                                setActionTenant(t);
                                setActionType("payment");
                              }}>
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title={t.active ? "Bloquear" : "Desbloquear"} onClick={() => {
                                setActionTenant(t);
                                setActionType("block");
                              }}>
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title="Cancelar assinatura" className="text-destructive" onClick={() => {
                                setActionTenant(t);
                                setActionType("cancel");
                              }}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Receita Total</CardDescription>
                <CardTitle className="text-2xl">R$ {metrics.totalRevenue.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Receita Mensal (MRR)</CardDescription>
                <CardTitle className="text-2xl">R$ {metrics.mrr.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pagamentos Pendentes</CardDescription>
                <CardTitle className="text-2xl">{metrics.pendingPayments}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </>
      )}

      {/* Block Dialog */}
      <Dialog open={actionType === "block"} onOpenChange={o => !o && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTenant?.active ? "Bloquear" : "Desbloquear"} Conta</DialogTitle>
            <DialogDescription>
              {actionTenant?.active
                ? `Tem certeza que deseja bloquear "${actionTenant?.name}"? A empresa não poderá acessar o sistema.`
                : `Deseja desbloquear "${actionTenant?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setActionType(null)}>Cancelar</Button>
            <Button variant={actionTenant?.active ? "destructive" : "default"} onClick={handleBlock} disabled={actionSaving}>
              {actionSaving ? "Processando..." : actionTenant?.active ? "Bloquear" : "Desbloquear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={actionType === "cancel"} onOpenChange={o => !o && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar a assinatura de "{actionTenant?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setActionType(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionSaving}>
              {actionSaving ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={actionType === "plan"} onOpenChange={o => !o && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano — {actionTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={actionPlanId} onValueChange={setActionPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price.toFixed(2)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={actionSaving || !actionPlanId}>
              {actionSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={actionType === "payment"} onOpenChange={o => !o && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Manual</DialogTitle>
            <DialogDescription>
              Confirmar pagamento de "{actionTenant?.name}"? O plano será renovado por mais 30 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setActionType(null)}>Cancelar</Button>
            <Button onClick={handleManualPayment} disabled={actionSaving}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {actionSaving ? "Confirmando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformDashboard;
