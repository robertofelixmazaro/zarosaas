import { useEffect, useState } from "react";
import { fetchAppointments, fetchServices, fetchBarbers, fetchBarberAvailability, fetchBlockedDates, fetchBarberByUserId, fetchAdminPhone, createAppointment, generateTimeSlots, updateAppointmentStatus, deleteAppointment, DbAppointment, DbService, DbBarber, DbAvailability, DbBlockedDate } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MessageCircle, Check, X, Plus, CalendarIcon, Trash2, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmado: { label: "Confirmado", className: "bg-info/10 text-info border-info/20" },
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  concluido: { label: "Concluído", className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusFilters = ["todos", "pendente", "confirmado", "concluido", "cancelado"];

const AdminAgendamentos = () => {
  const { user, userRole } = useAuth();
  const { tenantId } = useTenant();
  const isAdmin = userRole === "admin";
  const [myBarberId, setMyBarberId] = useState<string | undefined>();
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [services, setServices] = useState<DbService[]>([]);
  const [barbers, setBarbers] = useState<DbBarber[]>([]);
  const [availability, setAvailability] = useState<DbAvailability[]>([]);
  const [blockedDates, setBlockedDates] = useState<DbBlockedDate[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("10:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);
  const [myBlockedDates, setMyBlockedDates] = useState<DbBlockedDate[]>([]);

  const loadData = async (barberId?: string) => {
    const data = await fetchAppointments(barberId, tenantId || undefined);
    setAppointments(data);
    if (barberId) {
      const allBlocked = await fetchBlockedDates(tenantId || undefined);
      setMyBlockedDates(allBlocked.filter((bd) => bd.barber_id === barberId));
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!isAdmin && user) {
        const barber = await fetchBarberByUserId(user.id);
        if (barber) {
          setMyBarberId(barber.id);
          loadData(barber.id);
          return;
        }
      }
      loadData();
    };
    init();
  }, [user, isAdmin, tenantId]);

  const openDialog = async () => {
    const [s, b, bd] = await Promise.all([fetchServices(tenantId || undefined), fetchBarbers(tenantId || undefined), fetchBlockedDates(tenantId || undefined)]);
    setServices(s);
    setBarbers(b);
    setBlockedDates(bd);
    resetForm();
    if (myBarberId) setSelectedBarberId(myBarberId);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedServiceId("");
    setSelectedBarberId("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setClientName("");
    setClientPhone("");
    setAvailability([]);
  };

  useEffect(() => {
    if (selectedBarberId) {
      fetchBarberAvailability(selectedBarberId).then(setAvailability);
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [selectedBarberId]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const getAvailableSlots = () => {
    if (!selectedBarberId || !selectedDate || !selectedService) return [];
    const dayOfWeek = selectedDate.getDay();
    const avail = availability.find((a) => a.day_of_week === dayOfWeek && a.active);
    if (!avail) return [];
    const allSlots = generateTimeSlots(avail.start_time, avail.end_time, selectedService.duration_minutes);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const blocksForDate = blockedDates.filter((bd) => (bd.blocked_date === dateStr || !bd.blocked_date) && !bd.all_day && (!bd.barber_id || bd.barber_id === selectedBarberId));
    if (blocksForDate.length === 0) return allSlots;
    return allSlots.filter((slot) => {
      return !blocksForDate.some((bd) => {
        const start = bd.start_time?.slice(0, 5) || "00:00";
        const end = bd.end_time?.slice(0, 5) || "23:59";
        return slot >= start && slot < end;
      });
    });
  };

  const handleCreate = async () => {
    if (!selectedService || !selectedBarberId || !selectedDate || !selectedTime || !clientName || !clientPhone) return;
    setSubmitting(true);
    try {
      await createAppointment({
        client_name: clientName,
        client_phone: clientPhone,
        barber_id: selectedBarberId,
        service_id: selectedServiceId,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        tenant_id: tenantId || undefined,
      });
      toast.success("Agendamento criado com sucesso!");
      setDialogOpen(false);
      loadData(myBarberId);
    } catch (err: any) {
      toast.error("Erro ao criar agendamento", { description: err.message });
    }
    setSubmitting(false);
  };

  const sendWhatsAppConfirmation = (appointment: DbAppointment) => {
    const serviceName = appointment.services?.name || "serviço";
    const barberName = appointment.barbers?.name || "";
    const date = appointment.appointment_date;
    const time = appointment.appointment_time?.slice(0, 5);
    const price = Number(appointment.price).toFixed(0);

    // Mensagem para o cliente
    const clientMsg = encodeURIComponent(
      `✅ *Agendamento Confirmado!*\n\n` +
      `Olá, ${appointment.client_name}! Seu agendamento foi confirmado:\n\n` +
      `💈 Serviço: ${serviceName}\n` +
      `✂️ Barbeiro: ${barberName}\n` +
      `📅 Data: ${date}\n` +
      `🕐 Horário: ${time}\n` +
      `💰 Valor: R$ ${price}\n\n` +
      `Aguardamos você! 😊`
    );
    const clientPhone = appointment.client_phone.replace(/\D/g, "");
    if (clientPhone) {
      window.open(`https://wa.me/55${clientPhone}?text=${clientMsg}`, "_blank");
    }

    // Mensagem para o administrador
    fetchAdminPhone(tenantId || undefined).then((phone) => {
      if (phone) {
        const adminMsg = encodeURIComponent(
          `📋 *Agendamento Confirmado*\n\n` +
          `Cliente: ${appointment.client_name}\n` +
          `Telefone: ${appointment.client_phone}\n` +
          `Serviço: ${serviceName}\n` +
          `Barbeiro: ${barberName}\n` +
          `Data: ${date} às ${time}\n` +
          `Valor: R$ ${price}`
        );
        window.open(`https://wa.me/55${phone.replace(/\D/g, "")}?text=${adminMsg}`, "_blank");
      }
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      toast.success(`Status atualizado para ${statusConfig[status]?.label || status}`);

      if (status === "confirmado") {
        const appointment = appointments.find((a) => a.id === id);
        if (appointment) {
          sendWhatsAppConfirmation(appointment);
        }
      }

      loadData(myBarberId);
    } catch (err: any) {
      toast.error("Erro ao atualizar", { description: err.message });
    }
  };

  const filtered = appointments.filter((a) => {
    const matchSearch = a.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.services?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSaveBlock = async () => {
    if (!myBarberId) { toast.error("Erro: barbeiro não identificado"); return; }
    if (!blockAllDay && (!blockStartTime || !blockEndTime)) { toast.error("Preencha os horários"); return; }
    setBlockSaving(true);
    try {
      const { error } = await (await import("@/integrations/supabase/client")).supabase
        .from("blocked_dates" as any)
        .insert({
          blocked_date: blockDate || null,
          reason: blockReason || null,
          all_day: blockAllDay,
          start_time: blockAllDay ? null : blockStartTime,
          end_time: blockAllDay ? null : blockEndTime,
          barber_id: myBarberId,
        } as any);
      if (error) throw error;
      toast.success("Horário bloqueado!");
      setBlockDialogOpen(false);
      setBlockDate(""); setBlockReason(""); setBlockAllDay(false); setBlockStartTime("09:00"); setBlockEndTime("10:00");
      loadData(myBarberId);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
    setBlockSaving(false);
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      const { supabase: sb } = await import("@/integrations/supabase/client");
      await sb.from("blocked_dates" as any).delete().eq("id", id);
      toast.success("Bloqueio removido!");
      loadData(myBarberId);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente ou serviço..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((s) => (
              <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} className="capitalize">
                {s === "todos" ? "Todos" : statusConfig[s]?.label || s}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {myBarberId && (
            <Button variant="outline" onClick={() => setBlockDialogOpen(true)} className="gap-2">
              <Lock className="h-4 w-4" /> Bloquear Horário
            </Button>
          )}
          <Button onClick={openDialog} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* My blocked dates list for barbers */}
      {myBarberId && myBlockedDates.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Meus Horários Bloqueados</h3>
          <div className="space-y-2">
            {myBlockedDates.map((bd) => (
              <div key={bd.id} className="flex items-center justify-between p-2 rounded border bg-background text-sm">
                <div>
                  <span className="font-medium">
                    {bd.blocked_date ? new Date(bd.blocked_date + "T12:00:00").toLocaleDateString("pt-BR") : "Permanente"}
                  </span>
                  {bd.all_day ? (
                    <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Dia inteiro</span>
                  ) : (
                    <span className="ml-2 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                      {bd.start_time?.slice(0, 5)} - {bd.end_time?.slice(0, 5)}
                    </span>
                  )}
                  {bd.reason && <span className="ml-2 text-muted-foreground">— {bd.reason}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveBlock(bd.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Data <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para bloquear permanentemente até desbloquear</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={blockAllDay} onCheckedChange={setBlockAllDay} />
              <span className="text-sm font-medium">Dia inteiro</span>
            </div>
            {!blockAllDay && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Início</label>
                  <Input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="w-32" />
                </div>
                <span className="text-muted-foreground text-sm mt-5">até</span>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fim</label>
                  <Input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="w-32" />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Motivo</label>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ex: Consulta médica" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveBlock} disabled={blockSaving}>
                {blockSaving ? "Salvando..." : "Bloquear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Serviço</label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.icon} {s.name} — R$ {Number(s.price).toFixed(0)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Barbeiro</label>
              {myBarberId ? (
                <Input value={barbers.find(b => b.id === myBarberId)?.name || ""} disabled />
              ) : (
                <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedBarberId && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                      disabled={(date) => {
                        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                        const dateStr = format(date, "yyyy-MM-dd");
                        const allDayBlock = blockedDates.some((bd) => (bd.blocked_date === dateStr || !bd.blocked_date) && bd.all_day && (!bd.barber_id || bd.barber_id === selectedBarberId));
                        if (allDayBlock) return true;
                        const day = date.getDay();
                        return !availability.some((a) => a.day_of_week === day && a.active);
                      }}
                      locale={ptBR}
                      className="rounded-lg border p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {selectedDate && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Horário</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableSlots().map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableSlots().length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Nenhum horário disponível neste dia.</p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome do cliente</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">WhatsApp do cliente</label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>

            {selectedService && selectedTime && (
              <div className="p-4 rounded-lg border bg-muted/50 text-sm space-y-1">
                <div className="font-semibold mb-2">Resumo</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span>{selectedService.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Barbeiro</span><span>{barbers.find(b => b.id === selectedBarberId)?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{selectedDate && format(selectedDate, "dd/MM/yyyy")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span>{selectedTime}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1 font-semibold"><span>Valor</span><span>R$ {Number(selectedService.price).toFixed(0)}</span></div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={submitting || !selectedServiceId || !selectedBarberId || !selectedDate || !selectedTime || !clientName || !clientPhone}
              className="w-full"
            >
              {submitting ? "Criando..." : "Criar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Serviço</th>
                {isAdmin && <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Barbeiro</th>}
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-sm">{a.client_name}</div>
                    <div className="text-xs text-muted-foreground">{a.client_phone}</div>
                  </td>
                  <td className="p-4 text-sm">{a.services?.name}</td>
                  {isAdmin && <td className="p-4 text-sm">{a.barbers?.name}</td>}
                  <td className="p-4 text-sm">{a.appointment_date}<br /><span className="text-muted-foreground">{a.appointment_time?.slice(0, 5)}</span></td>
                  <td className="p-4"><Badge variant="outline" className={statusConfig[a.status]?.className}>{statusConfig[a.status]?.label}</Badge></td>
                  <td className="p-4 font-semibold text-sm">R$ {Number(a.price).toFixed(0)}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Confirmar" onClick={() => handleStatusChange(a.id, "confirmado")}>
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar" onClick={() => handleStatusChange(a.id, "cancelado")}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                      {a.status === "cancelado" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" onClick={async () => {
                          if (!confirm("Tem certeza que deseja excluir este agendamento cancelado?")) return;
                          try {
                            await deleteAppointment(a.id);
                            toast.success("Agendamento excluído");
                            loadData(myBarberId);
                          } catch (err: any) {
                            toast.error("Erro ao excluir", { description: err.message });
                          }
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp" onClick={() => window.open(`https://wa.me/${a.client_phone.replace(/\D/g, "")}`, "_blank")}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground">Nenhum agendamento encontrado.</div>}
      </div>
    </div>
  );
};

export default AdminAgendamentos;
