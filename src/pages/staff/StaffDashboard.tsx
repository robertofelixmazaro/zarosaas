import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StaffDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todayAppointments: 0, totalClients: 0, completed: 0, upcoming: 0 });
  const [todayList, setTodayList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Find barber record for this user
      const { data: barber } = await supabase
        .from("barbers")
        .select("id, tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!barber) {
        setLoading(false);
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");

      const { data: todayAppts } = await supabase
        .from("appointments")
        .select("*, services(name)")
        .eq("barber_id", barber.id)
        .eq("appointment_date", today)
        .order("appointment_time");

      const { data: allAppts } = await supabase
        .from("appointments")
        .select("client_name, status")
        .eq("barber_id", barber.id);

      const appointments = todayAppts || [];
      const all = allAppts || [];

      const uniqueClients = new Set(all.map((a: any) => a.client_name)).size;
      const completed = all.filter((a: any) => a.status === "concluido").length;
      const upcoming = appointments.filter((a: any) => a.status === "confirmado" || a.status === "pendente").length;

      setStats({
        todayAppointments: appointments.length,
        totalClients: uniqueClients,
        completed,
        upcoming,
      });
      setTodayList(appointments);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const cards = [
    { title: "Hoje", value: stats.todayAppointments, icon: Calendar, color: "text-primary" },
    { title: "Próximos", value: stats.upcoming, icon: Clock, color: "text-orange-500" },
    { title: "Concluídos", value: stats.completed, icon: CheckCircle, color: "text-green-500" },
    { title: "Clientes Atendidos", value: stats.totalClients, icon: Users, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Painel</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
};

export default StaffDashboard;
