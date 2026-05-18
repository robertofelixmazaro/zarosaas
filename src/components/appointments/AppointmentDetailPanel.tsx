import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User, Scissors, Clock, DollarSign, MessageCircle, Phone, MapPin } from "lucide-react";
import AppointmentStatusBadge, { allStatuses, statusConfig } from "./AppointmentStatusBadge";
import { DbAppointment } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  appointment: DbAppointment | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const DEFAULT_WA_MESSAGE = "Olá {{cliente}}, estou entrando em contato sobre seu agendamento de {{servico}} marcado para {{data}} às {{hora}}. — {{empresa}}";

const AppointmentDetailPanel = ({ appointment, open, onClose, onStatusChange }: Props) => {
  const { tenantId, tenant } = useTenant();
  const [waMessage, setWaMessage] = useState(DEFAULT_WA_MESSAGE);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_default_message")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setWaMessage(data.value);
      });
  }, [tenantId]);

  if (!appointment) return null;

  const dateObj = new Date(appointment.appointment_date + "T12:00:00");
  const formattedDate = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const shortDate = format(dateObj, "dd/MM/yyyy");
  const time = appointment.appointment_time?.slice(0, 5) || "";

  const buildWhatsAppUrl = () => {
    const phone = appointment.client_phone.replace(/\D/g, "");
    const text = waMessage
      .replace(/\{\{cliente\}\}/g, appointment.client_name)
      .replace(/\{\{servico\}\}/g, appointment.services?.name || "")
      .replace(/\{\{data\}\}/g, shortDate)
      .replace(/\{\{hora\}\}/g, time)
      .replace(/\{\{empresa\}\}/g, tenant?.name || "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Agendamento</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="flex items-center gap-3">
              <AppointmentStatusBadge status={appointment.status} />
              <Select value={appointment.status} onValueChange={(v) => onStatusChange(appointment.id, v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Client info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Cliente</h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{appointment.client_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {appointment.client_phone}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 mt-1"
                onClick={() => window.open(buildWhatsAppUrl(), "_blank")}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            </div>
          </div>

          <Separator />

          {/* Service info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Scissors className="h-4 w-4" /> Serviço</h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{appointment.services?.name || "—"}</p>
              <p className="text-sm text-muted-foreground">Profissional: {appointment.barbers?.name || "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Data e Horário</h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="font-medium capitalize">{formattedDate}</p>
              <p className="text-lg font-bold">{time}</p>
            </div>
          </div>

          <Separator />

          {/* Price */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valor</h4>
            <p className="text-2xl font-bold">R$ {Number(appointment.price).toFixed(2)}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppointmentDetailPanel;
