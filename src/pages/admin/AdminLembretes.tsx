import { useEffect, useState, useRef } from "react";
import { Bell, Send, Check, Clock, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { format, addMinutes, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { playUrgentReminderSound } from "@/lib/notificationSound";

interface ReminderAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  reminder_sent: boolean;
  barbers?: { name: string };
  services?: { name: string };
}

const AdminLembretes = () => {
  const { tenantId } = useTenant();
  const [appointments, setAppointments] = useState<ReminderAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "sent" | "all">("pending");

  const loadAppointments = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    let query = supabase
      .from("appointments" as any)
      .select("id, client_name, client_phone, appointment_date, appointment_time, reminder_sent, barbers(name), services(name)")
      .gte("appointment_date", today)
      .in("status", ["pendente", "confirmado"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (filter === "pending") {
      query = query.eq("reminder_sent", false);
    } else if (filter === "sent") {
      query = query.eq("reminder_sent", true);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar lembretes");
      console.error(error);
    }
    const loaded = (data as any) || [];
    setAppointments(loaded);
    setLoading(false);

    // Check for urgent reminders and play sound
    const hasUrgent = loaded.some((a: ReminderAppointment) => !a.reminder_sent && checkIsUpcomingSoon(a));
    if (hasUrgent) {
      playUrgentReminderSound();
      toast.warning("⏰ Atenção! Agendamentos nos próximos 30 minutos aguardam lembrete!", { duration: 6000 });
    }
  };

  const checkIsUpcomingSoon = (appt: ReminderAppointment) => {
    try {
      const now = new Date();
      const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
      const thirtyMinBefore = addMinutes(apptDateTime, -30);
      return now >= thirtyMinBefore && now <= apptDateTime;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    loadAppointments();
    // Auto-refresh every 60s to catch new urgent reminders
    const interval = setInterval(loadAppointments, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const formatPhone = (phone: string) => {
    // Remove everything except digits
    let digits = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
    if (!digits.startsWith("55")) {
      digits = "55" + digits;
    }
    return digits;
  };

  const buildWhatsAppMessage = (appt: ReminderAppointment) => {
    const dateStr = format(parseISO(appt.appointment_date), "dd/MM/yyyy", { locale: ptBR });
    const timeStr = appt.appointment_time.slice(0, 5);
    const barberName = (appt.barbers as any)?.name || "nosso profissional";
    const serviceName = (appt.services as any)?.name || "seu serviço";

    return encodeURIComponent(
      `Olá ${appt.client_name}! 👋\n\n` +
      `🔔 *Lembrete de Agendamento*\n\n` +
      `📅 Data: *${dateStr}*\n` +
      `🕐 Horário: *${timeStr}*\n` +
      `✂️ Serviço: *${serviceName}*\n` +
      `💈 Profissional: *${barberName}*\n\n` +
      `Estamos te esperando! 😄`
    );
  };

  const handleSendReminder = async (appt: ReminderAppointment) => {
    const phone = formatPhone(appt.client_phone);
    const message = buildWhatsAppMessage(appt);
    const url = `https://wa.me/${phone}?text=${message}`;

    // Open WhatsApp
    window.open(url, "_blank");

    // Mark as sent
    const { error } = await supabase
      .from("appointments" as any)
      .update({ reminder_sent: true } as any)
      .eq("id", appt.id);

    if (error) {
      toast.error("Erro ao marcar lembrete");
    } else {
      toast.success(`Lembrete enviado para ${appt.client_name}`);
      loadAppointments();
    }
  };

  const handleMarkSent = async (id: string) => {
    const { error } = await supabase
      .from("appointments" as any)
      .update({ reminder_sent: true } as any)
      .eq("id", id);
    if (!error) {
      toast.success("Marcado como enviado");
      loadAppointments();
    }
  };

  const handleUnmark = async (id: string) => {
    const { error } = await supabase
      .from("appointments" as any)
      .update({ reminder_sent: false } as any)
      .eq("id", id);
    if (!error) {
      toast.info("Lembrete desmarcado");
      loadAppointments();
    }
  };

  const pendingCount = appointments.filter((a) => !a.reminder_sent).length;
  const urgentCount = appointments.filter((a) => !a.reminder_sent && checkIsUpcomingSoon(a)).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Lembretes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envie lembretes via WhatsApp para clientes com agendamentos próximos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAppointments} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{urgentCount}</p>
          <p className="text-xs text-muted-foreground">Próximos 30 min</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{appointments.filter((a) => a.reminder_sent).length}</p>
          <p className="text-xs text-muted-foreground">Enviados</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {([
          { value: "pending", label: "Pendentes" },
          { value: "sent", label: "Enviados" },
          { value: "all", label: "Todos" },
        ] as const).map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : appointments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum lembrete {filter === "pending" ? "pendente" : filter === "sent" ? "enviado" : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => {
            const urgent = checkIsUpcomingSoon(appt);
            const dateStr = format(parseISO(appt.appointment_date), "dd/MM", { locale: ptBR });
            const timeStr = appt.appointment_time.slice(0, 5);

            return (
              <div
                key={appt.id}
                className={`flex items-center justify-between p-4 rounded-lg border bg-card ${
                  urgent && !appt.reminder_sent ? "border-destructive ring-1 ring-destructive/30" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{appt.client_name}</span>
                    {urgent && !appt.reminder_sent && (
                      <Badge variant="destructive" className="text-xs">⏰ Em breve!</Badge>
                    )}
                    {appt.reminder_sent && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Check className="h-3 w-3" /> Enviado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {dateStr} às {timeStr}
                    </span>
                    <span>✂️ {(appt.services as any)?.name}</span>
                    <span>💈 {(appt.barbers as any)?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">📱 {appt.client_phone}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {!appt.reminder_sent ? (
                    <>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleSendReminder(appt)}
                      >
                        <MessageSquare className="h-4 w-4" /> Enviar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Marcar como enviado"
                        onClick={() => handleMarkSent(appt.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnmark(appt.id)}
                    >
                      Desmarcar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLembretes;
