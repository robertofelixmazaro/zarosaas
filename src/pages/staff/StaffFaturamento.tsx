import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const StaffFaturamento = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, commission: 0, services: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; commission: number; services: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: barber } = await supabase
        .from("barbers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!barber) { setLoading(false); return; }

      const { data: appts } = await supabase
        .from("appointments")
        .select("price, staff_commission, company_revenue, appointment_date, status")
        .eq("barber_id", barber.id)
        .eq("status", "concluido");

      const all = appts || [];
      const totalRevenue = all.reduce((s, a) => s + Number(a.price || 0), 0);
      const totalCommission = all.reduce((s, a) => s + Number(a.staff_commission || 0), 0);
      setTotals({ revenue: totalRevenue, commission: totalCommission, services: all.length });

      // Group by month (last 6 months)
      const months: typeof monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = format(startOfMonth(d), "yyyy-MM-dd");
        const end = format(endOfMonth(d), "yyyy-MM-dd");
        const label = format(d, "MMM yyyy", { locale: ptBR });
        const filtered = all.filter(a => a.appointment_date >= start && a.appointment_date <= end);
        months.push({
          month: label,
          revenue: filtered.reduce((s, a) => s + Number(a.price || 0), 0),
          commission: filtered.reduce((s, a) => s + Number(a.staff_commission || 0), 0),
          services: filtered.length,
        });
      }
      setMonthlyData(months);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meu Faturamento</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Faturamento Gerado</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(totals.revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Minha Comissão</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{fmtBRL(totals.commission)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Serviços Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totals.services}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium capitalize">{m.month}</p>
                    <p className="text-xs text-muted-foreground">{m.services} serviços</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{fmtBRL(m.revenue)}</p>
                    <p className="text-xs text-green-600">Comissão: {fmtBRL(m.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffFaturamento;
