import { useEffect, useState } from "react";
import { fetchAppointmentsAdmin, fetchBarbers, fetchBarberByUserId, DbAppointment, DbBarber } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmado: { label: "Confirmado", className: "bg-info/10 text-info border-info/20" },
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  concluido: { label: "Concluído", className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const AdminDashboard = () => {
  const { user, userRole } = useAuth();
  const { tenantId } = useTenant();
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [barbers, setBarbers] = useState<DbBarber[]>([]);
  const [currentBarber, setCurrentBarber] = useState<DbBarber | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      let barberId: string | undefined;
      if (!isAdmin && user) {
        const barber = await fetchBarberByUserId(user.id);
        setCurrentBarber(barber);
        barberId = barber?.id;
      }
      const [a, b] = await Promise.all([
        fetchAppointmentsAdmin(barberId, tenantId),
        fetchBarbers(tenantId),
      ]);
      setAppointments(a);
      setBarbers(b);
      setLoading(false);
    };
    load();
  }, [user, isAdmin, tenantId]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppts = appointments.filter((a) => a.appointment_date === today);
  const totalHoje = todayAppts.reduce((acc, a) => acc + Number(a.price), 0);
  const totalMes = appointments.reduce((acc, a) => acc + Number(a.price), 0);

  const stats = [
    { icon: Calendar, label: "Agendamentos Hoje", value: todayAppts.length.toString(), color: "text-info" },
    { icon: DollarSign, label: "Faturamento Hoje", value: `R$ ${totalHoje}`, color: "text-success" },
    { icon: TrendingUp, label: "Faturamento Total", value: `R$ ${totalMes}`, color: "text-foreground" },
    ...(isAdmin ? [{ icon: Users, label: "Barbeiros Ativos", value: barbers.length.toString(), color: "text-secondary" }] : []),
  ];

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {!isAdmin && currentBarber && (
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Logado como barbeiro</p>
          <p className="text-lg font-bold">{currentBarber.name}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-lg border bg-card">
            <div className={`p-2 rounded-lg bg-muted ${s.color} inline-flex mb-3`}><s.icon className="h-4 w-4" /></div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-lg">Agenda de Hoje</h3>
          <span className="text-sm text-muted-foreground">{format(new Date(), "dd MMM yyyy")}</span>
        </div>
        <div className="divide-y">
          {todayAppts.length === 0 && <div className="p-6 text-center text-muted-foreground">Nenhum agendamento hoje.</div>}
          {todayAppts.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
              <div className="text-center min-w-[50px]"><div className="text-sm font-bold">{a.appointment_time?.slice(0, 5)}</div></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.client_name}</div>
                <div className="text-sm text-muted-foreground">{a.services?.name} · {a.barbers?.name}</div>
              </div>
              <Badge variant="outline" className={statusConfig[a.status]?.className}>{statusConfig[a.status]?.label}</Badge>
              <div className="font-semibold text-sm">R$ {Number(a.price).toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="font-semibold mb-4">Equipe Ativa</h3>
            <div className="space-y-3">
              {barbers.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{b.name[0]}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.specialty}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${b.active ? "bg-success" : "bg-muted"}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <h3 className="font-semibold mb-4">Últimos Agendamentos</h3>
            <div className="space-y-3">
              {appointments.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{a.client_name}</div>
                    <div className="text-xs text-muted-foreground">{a.appointment_date} · {a.appointment_time?.slice(0, 5)}</div>
                  </div>
                  <Badge variant="outline" className={statusConfig[a.status]?.className}>{statusConfig[a.status]?.label}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
