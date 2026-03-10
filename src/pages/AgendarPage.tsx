import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchServices, fetchBarbers, fetchBarberAvailability, fetchBlockedDates, fetchBookedSlots, createAppointment, DbService, DbBarber, DbAvailability, DbBlockedDate } from "@/lib/api";
import { generateRawSlots, filterAvailableSlots, isDateBlocked, isDayActive, BusinessHours, DEFAULT_BUSINESS_HOURS } from "@/lib/slotGenerator";
import { useTenant } from "@/contexts/TenantContext";
import { getNicheLabels } from "@/lib/nicheLabels";
import { ArrowLeft, Check, ChevronRight, Clock, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type Step = "servico" | "barbeiro" | "data" | "horario" | "dados" | "confirmacao";

const AgendarPage = () => {
  const navigate = useNavigate();
  const { tenantId, tenantSlug, tenant } = useTenant();
  const nicheLabels = getNicheLabels(tenant?.niche);
  const basePath = getTenantBasePath(tenantSlug);
  const [searchParams] = useSearchParams();
  const preSelectedServiceId = searchParams.get("servico");
  const [step, setStep] = useState<Step>(preSelectedServiceId ? "barbeiro" : "servico");
  const [services, setServices] = useState<DbService[]>([]);
  const [barbersList, setBarbersList] = useState<DbBarber[]>([]);
  const [availability, setAvailability] = useState<DbAvailability[]>([]);
  const [blockedDates, setBlockedDates] = useState<DbBlockedDate[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ time: string; duration: number }[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [barberLunch, setBarberLunch] = useState<{ enabled: boolean; start: string; end: string } | null>(null);
  const [selectedService, setSelectedService] = useState<DbService | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<DbBarber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // No-show policy
  const [noShowPolicy, setNoShowPolicy] = useState<{ enabled: boolean; deposit: number; retention: number; cancelHours: number }>({
    enabled: false, deposit: 0, retention: 100, cancelHours: 4,
  });

  // Real-time clock update every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // CRITICAL: Wait for tenantId before loading — prevents showing default/wrong hours
    if (!tenantId) {
      setLoading(true);
      return;
    }

    const loadInitial = async () => {
      setLoading(true);
      const [s, b, bd] = await Promise.all([
        fetchServices(tenantId),
        fetchBarbers(tenantId),
        fetchBlockedDates(tenantId),
      ]);
      setServices(s);
      setBarbersList(b);
      setBlockedDates(bd);
      if (preSelectedServiceId) {
        const found = s.find((svc) => svc.id === preSelectedServiceId);
        if (found) setSelectedService(found);
      }

      // Load tenant-specific business hours
      const { data: bhData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "business_hours")
        .maybeSingle();
      if (bhData?.value) {
        try {
          setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...JSON.parse(bhData.value) });
        } catch {
          setBusinessHours(DEFAULT_BUSINESS_HOURS);
        }
      } else {
        setBusinessHours(DEFAULT_BUSINESS_HOURS);
      }

      setLoading(false);
    };
    loadInitial();

    // Load no-show policy
    supabase
      .from("tenants" as any)
      .select("no_show_enabled, no_show_deposit_value, no_show_retention_percentage, no_show_cancel_limit_hours")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNoShowPolicy({
            enabled: (data as any).no_show_enabled || false,
            deposit: Number((data as any).no_show_deposit_value) || 0,
            retention: Number((data as any).no_show_retention_percentage) || 100,
            cancelHours: Number((data as any).no_show_cancel_limit_hours) || 4,
          });
        }
      });
  }, [preSelectedServiceId, tenantId]);

  useEffect(() => {
    if (selectedBarber && tenantId) {
      fetchBarberAvailability(selectedBarber.id, tenantId).then(setAvailability);
      // Load barber-specific lunch break
      supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", `barber_lunch_${selectedBarber.id}`)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            try { setBarberLunch(JSON.parse(data.value)); } catch { setBarberLunch(null); }
          } else {
            setBarberLunch(null);
          }
        });
    }
  }, [selectedBarber, tenantId]);

  const refreshBookedSlots = useCallback(() => {
    if (selectedBarber && selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      fetchBookedSlots(selectedBarber.id, dateStr).then(setBookedSlots).catch(() => setBookedSlots([]));
    }
  }, [selectedBarber, selectedDate]);

  // Fetch booked slots when date or barber changes
  useEffect(() => {
    refreshBookedSlots();
  }, [refreshBookedSlots]);

  // Realtime: listen for appointment changes and refresh slots
  useEffect(() => {
    if (!selectedBarber || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const channel = supabase
      .channel(`appointments-${selectedBarber.id}-${dateStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${selectedBarber.id}`,
        },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (row?.appointment_date === dateStr) {
            refreshBookedSlots();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBarber, selectedDate, refreshBookedSlots]);

  const steps: { key: Step; label: string }[] = [
    { key: "servico", label: "Serviço" },
    { key: "barbeiro", label: nicheLabels.staffSingular },
    { key: "data", label: "Data" },
    { key: "horario", label: "Horário" },
    { key: "dados", label: "Dados" },
    { key: "confirmacao", label: "Confirmação" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const getAvailableSlots = () => {
    if (!selectedBarber || !selectedDate || !selectedService) return [];
    // Full-day services don't need time slots
    if (selectedService.is_full_day) return ["08:00"];
    
    const dayOfWeek = selectedDate.getDay();
    const barberAvail = availability.find((a) => a.day_of_week === dayOfWeek && a.active);

    const rawSlots = generateRawSlots(
      dayOfWeek,
      selectedService.duration_minutes,
      businessHours,
      barberAvail ? { start_time: barberAvail.start_time, end_time: barberAvail.end_time, active: barberAvail.active } : null,
      barberLunch
    );

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return filterAvailableSlots(
      rawSlots,
      dateStr,
      selectedService.duration_minutes,
      bookedSlots,
      blockedDates,
      selectedBarber.id,
      now
    );
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;
    try {
      await createAppointment({
        client_name: nome,
        client_phone: whatsapp,
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        tenant_id: tenantId || undefined,
        email_cliente: email,
      });
      toast.success("Agendamento confirmado com sucesso!", {
        description: "Você receberá um e-mail de confirmação.",
      });
      setStep("confirmacao");
    } catch (err: any) {
      toast.error("Erro ao agendar", { description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center h-16 px-4 gap-4">
          <Link to={basePath || "/"}><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded-full object-cover" />
            ) : null}
            <span className="font-bold tracking-tight">{tenant?.name || "Agendamento"}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < currentStepIndex ? "bg-primary text-primary-foreground" :
                i === currentStepIndex ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === currentStepIndex ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {step === "servico" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Escolha o Serviço</h2>
            <p className="text-muted-foreground mb-6">Selecione o serviço que deseja agendar</p>
            <div className="grid gap-3">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setSelectedService(s); setStep("barbeiro"); }}
                  className="flex items-center gap-4 p-4 rounded-lg border text-left transition-all hover:shadow-md hover:border-foreground/20">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-2xl w-12 h-12 flex items-center justify-center flex-shrink-0">{s.icon}</span>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">R$ {Number(s.price).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {s.is_full_day ? "Dia inteiro" : `${s.duration_minutes}min`}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "barbeiro" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Escolha o {nicheLabels.staffSingular}</h2>
            <p className="text-muted-foreground mb-6">Selecione o profissional de sua preferência</p>
            <div className="grid gap-4">
              {barbersList.map((b) => (
                <button key={b.id} onClick={() => { setSelectedBarber(b); setStep("data"); }}
                  className="flex items-center gap-4 p-5 rounded-lg border text-left transition-all hover:shadow-md hover:border-foreground/20">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold">{b.name[0]}</div>
                  <div>
                    <div className="font-semibold text-lg">{b.name}</div>
                    <div className="text-sm text-muted-foreground">{b.specialty}</div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4" onClick={() => setStep("servico")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          </div>
        )}

        {step === "data" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Escolha a Data</h2>
            <p className="text-muted-foreground mb-6">Selecione o dia do seu agendamento</p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); if (d) { if (selectedService?.is_full_day) { setSelectedTime("08:00"); setStep("dados"); } else { setStep("horario"); } } }}
                disabled={(date) => {
                  if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                  const dateStr = format(date, "yyyy-MM-dd");
                  if (isDateBlocked(dateStr, blockedDates, selectedBarber?.id)) return true;
                  const day = date.getDay();
                  const barberAvail = availability.find((a) => a.day_of_week === day && a.active);
                  return !isDayActive(day, businessHours, barberAvail ? { active: barberAvail.active } : null);
                }}
                locale={ptBR}
                className="rounded-lg border p-3 pointer-events-auto"
              />
            </div>
            <Button variant="ghost" className="mt-4" onClick={() => setStep("barbeiro")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          </div>
        )}

        {step === "horario" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Escolha o Horário</h2>
            <p className="text-muted-foreground mb-6">{selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {getAvailableSlots().map((slot) => {
                const [h, m] = slot.split(":").map(Number);
                const endMin = h * 60 + m + (selectedService?.duration_minutes || 30);
                const endTime = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
                return (
                  <button key={slot} onClick={() => { setSelectedTime(slot); setStep("dados"); }}
                    className="p-3 rounded-lg border text-center transition-all hover:shadow-md hover:border-foreground/20">
                    <span className="font-medium">{slot}</span>
                    <span className="block text-[11px] text-muted-foreground">até {endTime}</span>
                  </button>
                );
              })}
            </div>
            {getAvailableSlots().length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum horário disponível.</p>}
            <Button variant="ghost" className="mt-4" onClick={() => setStep("data")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          </div>
        )}

        {step === "dados" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Seus Dados</h2>
            <p className="text-muted-foreground mb-6">Preencha para confirmar o agendamento</p>
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" type="email" className="pl-10" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-0000" className="pl-10" />
                </div>
              </div>
            </div>

            {/* No-show warning */}
            {noShowPolicy.enabled && noShowPolicy.deposit > 0 && (
              <div className="mt-4 p-4 rounded-lg border border-warning/30 bg-warning/10">
                <p className="text-sm font-medium text-foreground mb-1">⚠️ Garantia de Agendamento</p>
                <p className="text-sm text-muted-foreground">
                  Este agendamento exige uma garantia de <strong>R$ {noShowPolicy.deposit.toFixed(2)}</strong> para confirmar o horário.
                  Caso não compareça ou cancele fora do prazo de {noShowPolicy.cancelHours}h antes do horário,
                  {noShowPolicy.retention}% do valor poderá ser retido.
                </p>
              </div>
            )}

            <div className="mt-8 p-5 rounded-lg border bg-muted/50 space-y-2 text-sm">
              <div className="font-semibold text-base mb-3">Resumo do Agendamento</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{nicheLabels.staffSingular}</span><span className="font-medium">{selectedBarber?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{selectedDate && format(selectedDate, "dd/MM/yyyy")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span className="font-medium">{selectedTime}</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Total</span><span className="font-bold text-lg">R$ {selectedService && Number(selectedService.price).toFixed(0)}</span></div>
              {noShowPolicy.enabled && noShowPolicy.deposit > 0 && (
                <div className="flex justify-between text-warning"><span className="font-medium">Garantia</span><span className="font-medium">R$ {noShowPolicy.deposit.toFixed(2)}</span></div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep("horario")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
              <Button onClick={handleConfirm} disabled={!nome || !email || !whatsapp} className="flex-1">Confirmar Agendamento</Button>
            </div>
          </div>
        )}

        {step === "confirmacao" && (
          <div className="animate-fade-in text-center py-12">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {selectedService?.name} com {selectedBarber?.name}<br />
              {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(basePath || "/")}>Voltar ao Início</Button>
              <Button onClick={() => {
                setStep("servico"); setSelectedService(null); setSelectedBarber(null);
                setSelectedDate(undefined); setSelectedTime(null); setNome(""); setWhatsapp("");
              }}>Novo Agendamento</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendarPage;
