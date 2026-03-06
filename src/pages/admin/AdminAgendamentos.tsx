import { useEffect, useState, useCallback } from "react";
import { fetchAppointmentsAdmin, fetchServices, fetchBarbers, fetchBarberAvailability, fetchBlockedDates, fetchBarberByUserId, fetchAdminPhone, createAppointment, updateAppointmentStatus, DbAppointment, DbService, DbBarber, DbAvailability, DbBlockedDate } from "@/lib/api";
import { generateRawSlots, filterAvailableSlots, BusinessHours, DEFAULT_BUSINESS_HOURS } from "@/lib/slotGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarIcon, Lock, ChevronLeft, ChevronRight, CalendarDays, List, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import AppointmentFilters from "@/components/appointments/AppointmentFilters";
import AppointmentListView from "@/components/appointments/AppointmentListView";
import AppointmentDetailPanel from "@/components/appointments/AppointmentDetailPanel";
import CalendarDayView from "@/components/appointments/CalendarDayView";
import CalendarWeekView from "@/components/appointments/CalendarWeekView";
import { statusConfig } from "@/components/appointments/AppointmentStatusBadge";

type ViewMode = "day" | "week" | "list";

const AdminAgendamentos = () => {
  const { user, userRole } = useAuth();
  const { tenantId } = useTenant();
  const isAdmin = userRole === "admin";

  const [myBarberId, setMyBarberId] = useState<string | undefined>();
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [allBarbers, setAllBarbers] = useState<DbBarber[]>([]);
  const [allServices, setAllServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterBarberId, setFilterBarberId] = useState("todos");
  const [filterServiceId, setFilterServiceId] = useState("todos");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Detail panel
  const [selectedAppointment, setSelectedAppointment] = useState<DbAppointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
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

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("10:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);
  const [myBlockedDates, setMyBlockedDates] = useState<DbBlockedDate[]>([]);

  const loadData = useCallback(async (barberId?: string) => {
    const [data, bList, sList] = await Promise.all([
      fetchAppointmentsAdmin(barberId, tenantId || undefined),
      fetchBarbers(tenantId || undefined),
      fetchServices(tenantId || undefined),
    ]);
    setAppointments(data);
    setAllBarbers(bList);
    setAllServices(sList);
    if (barberId) {
      const allBlocked = await fetchBlockedDates(tenantId || undefined);
      setMyBlockedDates(allBlocked.filter((bd) => bd.barber_id === barberId));
    }
    setLoading(false);
  }, [tenantId]);

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
  }, [user, isAdmin, tenantId, loadData]);

  // Filtered appointments
  const filtered = appointments.filter((a) => {
    const matchSearch = !search || a.client_name.toLowerCase().includes(search.toLowerCase()) || (a.services?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || a.status === filterStatus;
    const matchBarber = filterBarberId === "todos" || a.barber_id === filterBarberId;
    const matchService = filterServiceId === "todos" || a.service_id === filterServiceId;
    const matchDateFrom = !dateFrom || a.appointment_date >= format(dateFrom, "yyyy-MM-dd");
    const matchDateTo = !dateTo || a.appointment_date <= format(dateTo, "yyyy-MM-dd");
    return matchSearch && matchStatus && matchBarber && matchService && matchDateFrom && matchDateTo;
  });

  // Open create dialog, optionally pre-filling date/time
  const openCreateDialog = async (preDate?: string, preTime?: string) => {
    const [s, b, bd] = await Promise.all([
      fetchServices(tenantId || undefined),
      fetchBarbers(tenantId || undefined),
      fetchBlockedDates(tenantId || undefined),
    ]);
    setServices(s);
    setBarbers(b);
    setBlockedDates(bd);
    resetForm();
    if (myBarberId) setSelectedBarberId(myBarberId);
    if (preDate) setSelectedDate(new Date(preDate + "T12:00:00"));
    if (preTime) setSelectedTime(preTime);
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
      fetchBarberAvailability(selectedBarberId, tenantId || undefined).then(setAvailability);
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [selectedBarberId, tenantId]);

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
    return allSlots.filter((slot) => !blocksForDate.some((bd) => {
      const start = bd.start_time?.slice(0, 5) || "00:00";
      const end = bd.end_time?.slice(0, 5) || "23:59";
      return slot >= start && slot < end;
    }));
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

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      toast.success(`Status atualizado para ${statusConfig[status]?.label || status}`);
      if (status === "confirmado") {
        const appointment = appointments.find((a) => a.id === id);
        if (appointment) sendWhatsAppConfirmation(appointment);
      }
      loadData(myBarberId);
      // Update detail panel if open
      if (selectedAppointment?.id === id) {
        setSelectedAppointment((prev) => prev ? { ...prev, status: status as any } : null);
      }
    } catch (err: any) {
      toast.error("Erro ao atualizar", { description: err.message });
    }
  };

  const sendWhatsAppConfirmation = (appointment: DbAppointment) => {
    const serviceName = appointment.services?.name || "serviço";
    const barberName = appointment.barbers?.name || "";
    const date = appointment.appointment_date;
    const time = appointment.appointment_time?.slice(0, 5);
    const price = Number(appointment.price).toFixed(0);
    const clientMsg = encodeURIComponent(
      `✅ *Agendamento Confirmado!*\n\nOlá, ${appointment.client_name}! Seu agendamento foi confirmado:\n\n💈 Serviço: ${serviceName}\n✂️ Profissional: ${barberName}\n📅 Data: ${date}\n🕐 Horário: ${time}\n💰 Valor: R$ ${price}\n\nAguardamos você! 😊`
    );
    const phone = appointment.client_phone.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/55${phone}?text=${clientMsg}`, "_blank");
  };

  const handleSaveBlock = async () => {
    if (!myBarberId) { toast.error("Erro: profissional não identificado"); return; }
    if (!blockAllDay && (!blockStartTime || !blockEndTime)) { toast.error("Preencha os horários"); return; }
    setBlockSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("blocked_dates" as any).insert({
        blocked_date: blockDate || null, reason: blockReason || null, all_day: blockAllDay,
        start_time: blockAllDay ? null : blockStartTime, end_time: blockAllDay ? null : blockEndTime, barber_id: myBarberId,
        tenant_id: tenantId,
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

  const onClickAppointment = (a: DbAppointment) => {
    setSelectedAppointment(a);
    setDetailOpen(true);
  };

  const currentDateStr = format(currentDate, "yyyy-MM-dd");

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Header with view toggle and navigation */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Dia</TabsTrigger>
              <TabsTrigger value="week" className="gap-1.5"><LayoutGrid className="h-4 w-4" /> Semana</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><List className="h-4 w-4" /> Lista</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "day" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => subDays(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{format(currentDate, "EEE, dd MMM yyyy", { locale: ptBR })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => addDays(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            </div>
          )}

          {viewMode === "week" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart((d) => subWeeks(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, "dd MMM", { locale: ptBR })} — {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoje</Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {myBarberId && (
            <Button variant="outline" onClick={() => setBlockDialogOpen(true)} className="gap-2">
              <Lock className="h-4 w-4" /> Bloquear
            </Button>
          )}
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AppointmentFilters
        search={search} onSearchChange={setSearch}
        filterStatus={filterStatus} onStatusChange={setFilterStatus}
        filterBarberId={filterBarberId} onBarberChange={setFilterBarberId}
        filterServiceId={filterServiceId} onServiceChange={setFilterServiceId}
        dateFrom={dateFrom} onDateFromChange={setDateFrom}
        dateTo={dateTo} onDateToChange={setDateTo}
        barbers={allBarbers} services={allServices}
      />

      {/* Views */}
      {viewMode === "day" && (
        <CalendarDayView
          date={currentDateStr}
          appointments={filtered}
          onClickAppointment={onClickAppointment}
          onClickSlot={(time) => openCreateDialog(currentDateStr, time)}
        />
      )}

      {viewMode === "week" && (
        <CalendarWeekView
          weekStart={weekStart}
          appointments={filtered}
          onClickAppointment={onClickAppointment}
          onClickSlot={(date, time) => openCreateDialog(date, time)}
        />
      )}

      {viewMode === "list" && (
        <AppointmentListView
          appointments={filtered}
          isAdmin={isAdmin}
          onClickAppointment={onClickAppointment}
          onStatusChange={handleStatusChange}
          onRefresh={() => loadData(myBarberId)}
        />
      )}

      {/* Detail panel */}
      <AppointmentDetailPanel
        appointment={selectedAppointment}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Block dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Bloquear Horário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Data <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
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
              <Button onClick={handleSaveBlock} disabled={blockSaving}>{blockSaving ? "Salvando..." : "Bloquear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
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
              <label className="text-sm font-medium mb-1.5 block">Profissional</label>
              {myBarberId ? (
                <Input value={barbers.find(b => b.id === myBarberId)?.name || ""} disabled />
              ) : (
                <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
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
                      mode="single" selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                      disabled={(date) => {
                        if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                        const dateStr = format(date, "yyyy-MM-dd");
                        const allDayBlock = blockedDates.some((bd) => (bd.blocked_date === dateStr || !bd.blocked_date) && bd.all_day && (!bd.barber_id || bd.barber_id === selectedBarberId));
                        if (allDayBlock) return true;
                        return !availability.some((a) => a.day_of_week === date.getDay() && a.active);
                      }}
                      locale={ptBR} className="rounded-lg border p-3 pointer-events-auto"
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
                    {getAvailableSlots().map((slot) => (<SelectItem key={slot} value={slot}>{slot}</SelectItem>))}
                  </SelectContent>
                </Select>
                {getAvailableSlots().length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhum horário disponível.</p>}
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
                <div className="flex justify-between"><span className="text-muted-foreground">Profissional</span><span>{barbers.find(b => b.id === selectedBarberId)?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span>{selectedDate && format(selectedDate, "dd/MM/yyyy")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span>{selectedTime}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1 font-semibold"><span>Valor</span><span>R$ {Number(selectedService.price).toFixed(0)}</span></div>
              </div>
            )}
            <Button onClick={handleCreate} disabled={submitting || !selectedServiceId || !selectedBarberId || !selectedDate || !selectedTime || !clientName || !clientPhone} className="w-full">
              {submitting ? "Criando..." : "Criar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgendamentos;
