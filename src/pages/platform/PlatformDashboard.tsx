import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, CalendarCheck, TrendingUp, CreditCard, BarChart3,
  Settings, UserCog, DollarSign, Filter, Clock, Handshake, Globe
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatMonthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return `${MONTH_LABELS[parseInt(mo) - 1]}/${y.slice(2)}`;
};

const PlatformDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [filterPlan, setFilterPlan] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [tenants, setTenants] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [t, s, a, p, pl] = await Promise.all([
        supabase.from("tenants").select("id, created_at, plan_id, active"),
        supabase.from("subscriptions").select("id, tenant_id, plan_id, status, trial_ends_at, created_at"),
        supabase.from("appointments").select("id, created_at, tenant_id, price"),
        supabase.from("payments").select("id, tenant_id, plan_id, amount, status, created_at"),
        supabase.from("plans").select("id, name"),
      ]);
      setTenants(t.data || []);
      setSubscriptions(s.data || []);
      setAppointments(a.data || []);
      setPayments(p.data || []);
      setPlans(pl.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const inRange = (dateStr: string | null) => {
      if (!dateStr) return true;
      const d = dateStr.substring(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };
    const tenantIds = filterPlan === "all"
      ? null
      : new Set(tenants.filter(t => t.plan_id === filterPlan).map(t => t.id));
    const ft = tenants.filter(t => inRange(t.created_at) && (!tenantIds || tenantIds.has(t.id)));
    const fs = subscriptions.filter(s => inRange(s.created_at) && (!tenantIds || tenantIds.has(s.tenant_id)));
    const fa = appointments.filter(a => inRange(a.created_at) && (!tenantIds || tenantIds.has(a.tenant_id)));
    const fp = payments.filter(p => inRange(p.created_at) && (!tenantIds || tenantIds.has(p.tenant_id)));
    return { tenants: ft, subscriptions: fs, appointments: fa, payments: fp };
  }, [tenants, subscriptions, appointments, payments, filterPlan, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const now = new Date();
    const activeSubs = filtered.subscriptions.filter(s => s.status === "active" || s.status === "trialing").length;
    const trialUsers = filtered.subscriptions.filter(s => {
      if (!s.trial_ends_at) return false;
      return new Date(s.trial_ends_at) > now;
    }).length;
    const totalRevenue = filtered.payments
      .filter(p => p.status === "approved")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlyRevenue = filtered.payments
      .filter(p => p.status === "approved" && p.created_at?.substring(0, 7) === thisMonth)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    return { totalTenants: filtered.tenants.length, activeSubs, trialUsers, totalAppointments: filtered.appointments.length, totalRevenue, monthlyRevenue };
  }, [filtered]);

  const charts = useMemo(() => {
    const groupByMonth = (items: any[], key = "created_at") => {
      const map: Record<string, number> = {};
      items.forEach(i => { if (!i[key]) return; const m = i[key].substring(0, 7); map[m] = (map[m] || 0) + 1; });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({ month, label: formatMonthLabel(month), count }));
    };
    const revenueByMonth = () => {
      const map: Record<string, number> = {};
      filtered.payments.filter(p => p.status === "approved").forEach(p => { if (!p.created_at) return; const m = p.created_at.substring(0, 7); map[m] = (map[m] || 0) + Number(p.amount); });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, amount]) => ({ month, label: formatMonthLabel(month), amount }));
    };
    return { tenantsPerMonth: groupByMonth(filtered.tenants), appointmentsPerMonth: groupByMonth(filtered.appointments), revenuePerMonth: revenueByMonth() };
  }, [filtered]);

  const statCards = [
    { title: "Total de Negócios", value: metrics.totalTenants, icon: Building2, color: "text-blue-500" },
    { title: "Assinaturas Ativas", value: metrics.activeSubs, icon: CreditCard, color: "text-green-500" },
    { title: "Usuários em Trial", value: metrics.trialUsers, icon: Clock, color: "text-orange-500" },
    { title: "Total de Agendamentos", value: metrics.totalAppointments, icon: CalendarCheck, color: "text-amber-500" },
    { title: "Receita Total", value: `R$ ${metrics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { title: "Receita Mensal", value: `R$ ${metrics.monthlyRevenue.toFixed(2)}`, icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Plano</Label>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  {plans.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {(dateFrom || dateTo || filterPlan !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setFilterPlan("all"); }}>Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map(card => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold text-foreground">{card.value}</p></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Novos Negócios / Mês</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.tenantsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" /><YAxis allowDecimals={false} /><Tooltip />
                    <Bar dataKey="count" name="Negócios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />Agendamentos / Mês</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={charts.appointmentsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="label" className="text-xs" /><YAxis allowDecimals={false} /><Tooltip />
                    <Line type="monotone" dataKey="count" name="Agendamentos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Receita / Mês</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={charts.revenuePerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="label" className="text-xs" /><YAxis /><Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]} />
                    <Area type="monotone" dataKey="amount" name="Receita" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default PlatformDashboard;
