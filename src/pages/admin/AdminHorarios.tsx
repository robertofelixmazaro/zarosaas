import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, CalendarOff, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const BLOCKS_INITIAL_VISIBLE = 5;

interface DayConfig {
  active: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  days: Record<string, DayConfig>;
  lunch: { enabled: boolean; start: string; end: string };
}

const DEFAULT_HOURS: BusinessHours = {
  days: {
    "0": { active: false, start: "08:00", end: "18:00" },
    "1": { active: true, start: "08:00", end: "18:00" },
    "2": { active: true, start: "08:00", end: "18:00" },
    "3": { active: true, start: "08:00", end: "18:00" },
    "4": { active: true, start: "08:00", end: "18:00" },
    "5": { active: true, start: "08:00", end: "18:00" },
    "6": { active: true, start: "08:00", end: "12:00" },
  },
  lunch: { enabled: true, start: "12:00", end: "13:00" },
};

interface BlockedEntry {
  id: string;
  blocked_date: string | null;
  reason: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  barber_id: string | null;
}

const AdminHorarios = () => {
  const { tenantId } = useTenant();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedDates, setBlockedDates] = useState<BlockedEntry[]>([]);
  const [showAllBlocks, setShowAllBlocks] = useState(false);

  // Block dialog
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("10:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "business_hours")
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setHours({ ...DEFAULT_HOURS, ...parsed });
        } catch {
          setHours(DEFAULT_HOURS);
        }
      }

      const { data: blocks } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("barber_id", null)
        .order("blocked_date");

      setBlockedDates((blocks as any[]) || []);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("key", "business_hours")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ value: JSON.stringify(hours), updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_settings")
          .insert({ key: "business_hours", value: JSON.stringify(hours), tenant_id: tenantId } as any);
      }

      await syncBarberAvailability();
      toast.success("Horário de funcionamento salvo!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  const syncBarberAvailability = async () => {
    if (!tenantId) return;
    const { data: barbers } = await supabase
      .from("barbers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if (!barbers || barbers.length === 0) return;

    for (const barber of barbers) {
      for (let day = 0; day <= 6; day++) {
        const dayConfig = hours.days[day.toString()];
        const { data: existing } = await supabase
          .from("barber_availability")
          .select("id")
          .eq("barber_id", barber.id)
          .eq("day_of_week", day)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("barber_availability")
            .update({
              start_time: dayConfig.start,
              end_time: dayConfig.end,
              active: dayConfig.active,
            } as any)
            .eq("id", (existing as any).id);
        } else if (dayConfig.active) {
          await supabase
            .from("barber_availability")
            .insert({
              barber_id: barber.id,
              day_of_week: day,
              start_time: dayConfig.start,
              end_time: dayConfig.end,
              active: dayConfig.active,
              tenant_id: tenantId,
            } as any);
        }
      }
    }
  };

  const updateDay = (day: string, field: keyof DayConfig, value: any) => {
    setHours((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: { ...prev.days[day], [field]: value } },
    }));
  };

  const updateLunch = (field: string, value: any) => {
    setHours((prev) => ({
      ...prev,
      lunch: { ...prev.lunch, [field]: value },
    }));
  };

  const handleAddBlock = async () => {
    if (!tenantId) return;
    if (!blockDate) {
      toast.error("Selecione uma data");
      return;
    }
    setBlockSaving(true);
    try {
      const { error } = await supabase.from("blocked_dates").insert({
        blocked_date: blockDate,
        reason: blockReason || null,
        all_day: blockAllDay,
        start_time: blockAllDay ? null : blockStartTime,
        end_time: blockAllDay ? null : blockEndTime,
        barber_id: null,
        tenant_id: tenantId,
      } as any);
      if (error) throw error;
      toast.success("Bloqueio adicionado!");
      setBlockDialogOpen(false);
      setBlockDate("");
      setBlockReason("");
      setBlockAllDay(true);

      const { data: blocks } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("barber_id", null)
        .order("blocked_date");
      setBlockedDates((blocks as any[]) || []);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
    setBlockSaving(false);
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await supabase.from("blocked_dates").delete().eq("id", id);
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bloqueio removido!");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  const visibleBlocks = showAllBlocks ? blockedDates : blockedDates.slice(0, BLOCKS_INITIAL_VISIBLE);
  const hasMoreBlocks = blockedDates.length > BLOCKS_INITIAL_VISIBLE;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Horário de Funcionamento</h1>
          <p className="text-muted-foreground">Configure os dias e horários de atendimento da sua loja</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Horários"}
        </Button>
      </div>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Dias da Semana</CardTitle>
          <CardDescription>Defina o horário de início e término para cada dia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAY_NAMES.map((name, i) => {
            const dayConfig = hours.days[i.toString()];
            return (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="w-8">
                  <Switch
                    checked={dayConfig.active}
                    onCheckedChange={(v) => updateDay(i.toString(), "active", v)}
                  />
                </div>
                <div className="w-36 font-medium text-sm">
                  {name}
                  {!dayConfig.active && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">Fechado</Badge>
                  )}
                </div>
                {dayConfig.active && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={dayConfig.start}
                      onChange={(e) => updateDay(i.toString(), "start", e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      value={dayConfig.end}
                      onChange={(e) => updateDay(i.toString(), "end", e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Lunch Break */}
      <Card>
        <CardHeader>
          <CardTitle>Intervalo / Almoço</CardTitle>
          <CardDescription>Período em que a loja não aceita agendamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch
              checked={hours.lunch.enabled}
              onCheckedChange={(v) => updateLunch("enabled", v)}
            />
            <Label className="font-medium">Habilitar intervalo</Label>
          </div>
          {hours.lunch.enabled && (
            <div className="flex items-center gap-2 mt-4">
              <Input
                type="time"
                value={hours.lunch.start}
                onChange={(e) => updateLunch("start", e.target.value)}
                className="w-28"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <Input
                type="time"
                value={hours.lunch.end}
                onChange={(e) => updateLunch("end", e.target.value)}
                className="w-28"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarOff className="h-5 w-5" /> Bloqueios de Agenda</CardTitle>
            <CardDescription>Dias ou horários específicos que a loja não funciona</CardDescription>
          </div>
          <Button size="sm" onClick={() => setBlockDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Adicionar Bloqueio
          </Button>
        </CardHeader>
        <CardContent>
          {blockedDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum bloqueio configurado</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBlocks.map((bd) => (
                    <TableRow key={bd.id}>
                      <TableCell className="font-medium">
                        {bd.blocked_date
                          ? new Date(bd.blocked_date + "T12:00:00").toLocaleDateString("pt-BR")
                          : "Recorrente"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bd.all_day ? "destructive" : "secondary"}>
                          {bd.all_day ? "Dia inteiro" : "Horário"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bd.all_day
                          ? "—"
                          : `${bd.start_time?.slice(0, 5)} – ${bd.end_time?.slice(0, 5)}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bd.reason || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(bd.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMoreBlocks && (
                <div className="flex justify-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllBlocks(!showAllBlocks)}
                    className="gap-1 text-muted-foreground"
                  >
                    {showAllBlocks ? (
                      <><ChevronUp className="h-4 w-4" /> Ver menos</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Ver mais ({blockedDates.length - BLOCKS_INITIAL_VISIBLE} restantes)</>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Bloqueio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Data</Label>
              <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={blockAllDay} onCheckedChange={setBlockAllDay} />
              <Label>Dia inteiro</Label>
            </div>
            {!blockAllDay && (
              <div className="flex items-center gap-3">
                <div>
                  <Label className="mb-1 block">Início</Label>
                  <Input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="w-28" />
                </div>
                <span className="text-muted-foreground text-sm mt-5">até</span>
                <div>
                  <Label className="mb-1 block">Fim</Label>
                  <Input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="w-28" />
                </div>
              </div>
            )}
            <div>
              <Label className="mb-1 block">Motivo (opcional)</Label>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ex: Feriado" />
            </div>
            <Button onClick={handleAddBlock} disabled={blockSaving} className="w-full">
              {blockSaving ? "Salvando..." : "Adicionar Bloqueio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHorarios;
