import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  confirmado: "bg-green-500/10 text-green-600 border-green-500/20",
  pendente: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  concluido: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-muted",
};

const StaffAgenda = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("barbers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBarberId(data.id);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!barberId) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    supabase
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .eq("barber_id", barberId)
      .eq("appointment_date", dateStr)
      .order("appointment_time")
      .then(({ data }) => setAppointments(data || []));
  }, [barberId, selectedDate]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!barberId) return <div className="p-6 text-muted-foreground">Perfil de profissional não encontrado.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minha Agenda</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={ptBR}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{format(selectedDate, "dd 'de' MMMM, EEEE", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum agendamento.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-1">
                      <p className="font-medium">{appt.client_name}</p>
                      <p className="text-sm text-muted-foreground">{(appt.services as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.client_phone}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-mono">{appt.appointment_time?.slice(0, 5)}</p>
                      <Badge variant="outline" className={statusColors[appt.status] || ""}>
                        {appt.status}
                      </Badge>
                      {(appt.status === "confirmado" || appt.status === "pendente") && (
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusChange(appt.id, "concluido")}>
                            Concluir
                          </Button>
                        </div>
                      )}
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

export default StaffAgenda;
