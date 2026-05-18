import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Scissors,
  Clock,
  DollarSign,
  MessageCircle,
  Phone,
  MapPin,
  Mail,
  Map,
  FileText,
  Timer,
  UserCog,
} from "lucide-react";
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

const DEFAULT_WA_MESSAGE =
  "Olá {{cliente}}, estou entrando em contato sobre seu agendamento de {{servico}} marcado para {{data}} às {{hora}}. — {{empresa}}";

interface OwnerInfo {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

const AppointmentDetailPanel = ({ appointment, open, onClose, onStatusChange }: Props) => {
  const { tenantId, tenant } = useTenant();
  const [waMessage, setWaMessage] = useState(DEFAULT_WA_MESSAGE);
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);

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

  // Fetch service duration + owner info when appointment changes
  useEffect(() => {
    if (!appointment || !tenantId) {
      setServiceDuration(null);
      setOwner(null);
      return;
    }
    supabase
      .from("services")
      .select("duration_minutes, is_full_day")
      .eq("id", appointment.service_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setServiceDuration(null);
        setServiceDuration(data.is_full_day ? 1440 : data.duration_minutes ?? null);
      });

    supabase
      .from("tenants")
      .select("owner_user_id, phone")
      .eq("id", tenantId)
      .maybeSingle()
      .then(async ({ data: t }) => {
        if (!t?.owner_user_id) {
          setOwner(t?.phone ? { phone: t.phone } : null);
          return;
        }
        const { data: p } = await supabase
          .from("profiles")
          .select("name, email, phone, whatsapp")
          .eq("auth_id", t.owner_user_id)
          .maybeSingle();
        setOwner({
          name: p?.name ?? null,
          email: p?.email ?? null,
          phone: p?.phone ?? t.phone ?? null,
          whatsapp: p?.whatsapp ?? null,
        });
      });
  }, [appointment?.id, tenantId]);

  if (!appointment) return null;

  const ap = appointment as any;
  const dateObj = new Date(appointment.appointment_date + "T12:00:00");
  const formattedDate = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const shortDate = format(dateObj, "dd/MM/yyyy");
  const time = appointment.appointment_time?.slice(0, 5) || "";

  const buildWhatsAppUrl = (phone: string) => {
    const clean = (phone || "").replace(/\D/g, "");
    const text = waMessage
      .replace(/\{\{cliente\}\}/g, appointment.client_name)
      .replace(/\{\{servico\}\}/g, appointment.services?.name || "")
      .replace(/\{\{data\}\}/g, shortDate)
      .replace(/\{\{hora\}\}/g, time)
      .replace(/\{\{empresa\}\}/g, tenant?.name || "");
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  // Address helpers
  const addr = {
    cep: ap.cep as string | undefined,
    endereco: ap.endereco as string | undefined,
    numero: ap.numero as string | undefined,
    bairro: ap.bairro as string | undefined,
    cidade: ap.cidade as string | undefined,
    estado: ap.estado as string | undefined,
    complemento: ap.complemento as string | undefined,
  };
  const hasAnyAddress = Boolean(
    addr.endereco || addr.cep || addr.bairro || addr.cidade
  );
  const addressComplete = Boolean(addr.endereco && addr.cidade && addr.estado);
  const mapsQuery = [
    addr.endereco,
    addr.numero,
    addr.bairro,
    addr.cidade,
    addr.estado,
    addr.cep,
  ]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const clientEmail = ap.client_email as string | undefined;
  const notes = ap.notes as string | undefined;

  const formatDuration = (mins: number | null) => {
    if (mins == null) return "—";
    if (mins >= 1440) return "Dia inteiro";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return [h ? `${h}h` : "", m ? `${m}min` : ""].filter(Boolean).join(" ") || `${mins}min`;
  };

  const ownerHasAny = owner && (owner.name || owner.email || owner.phone || owner.whatsapp);

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

          {/* Client */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" /> Cliente
            </h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{appointment.client_name}</p>
              {appointment.client_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {appointment.client_phone}
                </div>
              )}
              {clientEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${clientEmail}`} className="hover:underline">{clientEmail}</a>
                </div>
              )}
              {appointment.client_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mt-1"
                  onClick={() => window.open(buildWhatsAppUrl(appointment.client_phone), "_blank")}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Address */}
          {hasAnyAddress && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Endereço
                </h4>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                  {(addr.endereco || addr.numero) && (
                    <p>
                      {addr.endereco}
                      {addr.numero ? `, Nº ${addr.numero}` : ""}
                    </p>
                  )}
                  {addr.bairro && <p>{addr.bairro}</p>}
                  {addr.complemento && (
                    <p className="text-muted-foreground">Compl.: {addr.complemento}</p>
                  )}
                  {(addr.cidade || addr.estado) && (
                    <p>
                      {addr.cidade}
                      {addr.estado ? ` - ${addr.estado}` : ""}
                    </p>
                  )}
                  {addr.cep && <p>CEP {addr.cep}</p>}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mt-3"
                    disabled={!addressComplete}
                    onClick={() => window.open(mapsUrl, "_blank")}
                  >
                    <Map className="h-3.5 w-3.5" /> Abrir no Google Maps
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Service */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4" /> Serviço
            </h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{appointment.services?.name || "—"}</p>
              <p className="text-sm text-muted-foreground">
                Profissional: {appointment.barbers?.name || "—"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Duração: {formatDuration(serviceDuration)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold">R$ {Number(appointment.price).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Data e Horário
            </h4>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="font-medium capitalize">{formattedDate}</p>
              <p className="text-lg font-bold">{time}</p>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Observações
                </h4>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            </>
          )}

          {/* Owner */}
          {ownerHasAny && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <UserCog className="h-4 w-4" /> Proprietário
                </h4>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  {owner?.name && <p className="font-medium">{owner.name}</p>}
                  {(owner?.phone || owner?.whatsapp) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {owner?.phone || owner?.whatsapp}
                    </div>
                  )}
                  {owner?.email && (
                    <div className="flex items-center gap-2 text-muted-foreground break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <a href={`mailto:${owner.email}`} className="hover:underline">{owner.email}</a>
                    </div>
                  )}
                  {(owner?.whatsapp || owner?.phone) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mt-1"
                      onClick={() =>
                        window.open(buildWhatsAppUrl(owner?.whatsapp || owner?.phone || ""), "_blank")
                      }
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppointmentDetailPanel;
