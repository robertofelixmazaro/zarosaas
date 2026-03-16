import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle, Clock, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StaffDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todayAppointments: 0, totalClients: 0, completed: 0, upcoming: 0, totalRevenue: 0, totalCommission: 0 });
  const [todayList, setTodayList] = useState<any[]>([]);
  const [ranking, setRanking] = useState<{ name: string; services: number; revenue: number; commission: number }[]>([]);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: barber } = await supabase
        .from("barbers")
        .select("id, tenant_id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!barber) {
        setLoading(false);
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");

      const [todayRes, allRes, rankingRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(name)")
          .eq("barber_id", barber.id)
          .eq("appointment_date", today)
          .order("appointment_time"),
        supabase
          .from("appointments")
          .select("client_name, status, price, staff_commission, company_revenue")
          .eq("barber_id", barber.id),
        // Get all barbers and their completed appointments for ranking
        barber.tenant_id ? supabase
          .from("appointments")
          .select("barber_id, price, staff_commission, barbers(name)")
          .eq("tenant_id", barber.tenant_id)
          .eq("status", "concluido") : Promise.resolve({ data: [] }),
      ]);

      const appointments = todayRes.data || [];
      const all = allRes.data || [];

      const uniqueClients = new Set(all.map((a: any) => a.client_name)).size;
      const completed = all.filter((a: any) => a.status === "concluido").length;
      const upcoming = appointments.filter((a: any) => a.status === "confirmado" || a.status === "pendente").length;
      const totalRevenue = all.filter((a: any) => a.status === "concluido").reduce((acc: number, a: any) => acc + Number(a.price || 0), 0);
      const totalCommission = all.filter((a: any) => a.status === "concluido").reduce((acc: number, a: any) => acc + Number(a.staff_commission || 0), 0);

      setStats({
        todayAppointments: appointments.length,
        totalClients: uniqueClients,
        completed,
        upcoming,
        totalRevenue,
        totalCommission,
      });
      setTodayList(appointments);

      // Build ranking
      const rankMap = new Map<string, { name: string; services: number; revenue: number; commission: number }>();
      ((rankingRes as any).data || []).forEach((a: any) => {
        const barberId = a.barber_id;
        const barberName = a.barbers?.name || "Desconhecido";
        if (!rankMap.has(barberId)) {
          rankMap.set(barberId, { name: barberName, services: 0, revenue: 0, commission: 0 });
        }
        const entry = rankMap.get(barberId)!;
        entry.services += 1;
        entry.revenue += Number(a.price || 0);
        entry.commission += Number(a.staff_commission || 0);
      });
      const sorted = Array.from(rankMap.values()).sort((a, b) => b.revenue - a.revenue);
      setRanking(sorted);

      const pos = sorted.findIndex(r => r.name === barber.name);
      setMyPosition(pos >= 0 ? pos + 1 : null);

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const cards = [
    { title: "Hoje", value: stats.todayAppointments.toString(), icon: Calendar, color: "text-primary" },
    { title: "Próximos", value: stats.upcoming.toString(), icon: Clock, color: "text-orange-500" },
    { title: "Concluídos", value: stats.completed.toString(), icon: CheckCircle, color: "text-green-500" },
    { title: "Clientes Atendidos", value: stats.totalClients.toString(), icon: Users, color: "text-blue-500" },
    { title: "Faturamento Gerado", value: fmtBRL(stats.totalRevenue), icon: TrendingUp, color: "text-primary" },
    { title: "Minha Comissão", value: fmtBRL(stats.totalCommission), icon: DollarSign, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Painel</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agenda de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayList.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum agendamento para hoje.</p>
            ) : (
              <div className="space-y-3">
                {todayList.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{appt.client_name}</p>
                      <p className="text-sm text-muted-foreground">{(appt.services as any)?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{appt.appointment_time?.slice(0, 5)}</p>
                      <p className={`text-xs ${appt.status === "confirmado" ? "text-green-500" : appt.status === "pendente" ? "text-orange-500" : "text-muted-foreground"}`}>
                        {appt.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Ranking de Colaboradores</CardTitle>
            </div>
            {myPosition && (
              <p className="text-sm text-muted-foreground">Sua posição: <span className="font-bold text-primary">{myPosition}°</span></p>
            )}
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado de ranking disponível.</p>
            ) : (
              <div className="space-y-3">
                {ranking.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                        {i + 1}°
                      </span>
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.services} serviços</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{fmtBRL(r.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Comissão: {fmtBRL(r.commission)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
