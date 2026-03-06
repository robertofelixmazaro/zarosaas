import { useEffect, useState, useRef } from "react";
import { fetchAllBarbers, fetchAllAvailability, updateBarber, deleteBarber, upsertAvailability, DbBarber, DbAvailability } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Power, Upload, X, KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getNicheLabels } from "@/lib/nicheLabels";

const barberSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  specialty: z.string().trim().max(200).optional(),
});

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface AvailForm { active: boolean; start_time: string; end_time: string; }
interface LunchForm { enabled: boolean; start: string; end: string; }

const defaultAvail: AvailForm[] = Array.from({ length: 7 }, (_, i) => ({
  active: i >= 1 && i <= 5,
  start_time: "09:00",
  end_time: "18:00",
}));

const defaultLunch: LunchForm = { enabled: true, start: "12:00", end: "13:00" };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const AdminBarbeiros = () => {
  const { tenantId, tenant } = useTenant();
  const nicheLabels = getNicheLabels(tenant?.niche);
  const { canAddStaff, limits } = usePlanLimits();
  const [barbers, setBarbers] = useState<DbBarber[]>([]);
  const [availability, setAvailability] = useState<DbAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", specialty: "" });
  const [availForm, setAvailForm] = useState<AvailForm[]>(defaultAvail);
  const [lunchForm, setLunchForm] = useState<LunchForm>(defaultLunch);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Credential dialog state
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credBarberId, setCredBarberId] = useState<string | null>(null);
  const [credBarberName, setCredBarberName] = useState("");
  const [credHasUser, setCredHasUser] = useState(false);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credShowPw, setCredShowPw] = useState(false);
  const [credSaving, setCredSaving] = useState(false);

  const loadData = async () => {
    const [b, a] = await Promise.all([fetchAllBarbers(tenantId || undefined), fetchAllAvailability(tenantId || undefined)]);
    setBarbers(b); setAvailability(a); setLoading(false);
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const openCreate = () => {
    if (!canAddStaff()) {
      toast.error(`Limite de ${limits.maxStaff} profissionais atingido. Faça upgrade do seu plano.`);
      return;
    }
    setForm({ name: "", specialty: "" }); setEditingId(null); setErrors({});
    setAvailForm(defaultAvail); setLunchForm(defaultLunch);
    setPhotoFile(null); setPhotoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = async (b: DbBarber) => {
    setForm({ name: b.name, specialty: b.specialty || "" });
    setEditingId(b.id); setErrors({});
    setPhotoFile(null);
    setPhotoPreview(b.photo_url || null);
    const barberAvail = availability.filter(a => a.barber_id === b.id);
    const avail = Array.from({ length: 7 }, (_, i) => {
      const existing = barberAvail.find(a => a.day_of_week === i);
      return existing
        ? { active: existing.active, start_time: existing.start_time?.slice(0, 5), end_time: existing.end_time?.slice(0, 5) }
        : { active: false, start_time: "09:00", end_time: "18:00" };
    });
    setAvailForm(avail);
    
    // Load barber lunch break
    if (tenantId) {
      const { data: lunchData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", `barber_lunch_${b.id}`)
        .maybeSingle();
      if (lunchData?.value) {
        try { setLunchForm(JSON.parse(lunchData.value)); } catch { setLunchForm(defaultLunch); }
      } else {
        setLunchForm(defaultLunch);
      }
    }
    
    setDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (barberId: string): Promise<string | null> => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop();
    const path = `${barberId}.${ext}`;
    const { error } = await supabase.storage.from("barber-photos").upload(path, photoFile, { upsert: true });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/barber-photos/${path}`;
  };

  const handleSave = async () => {
    const parsed = barberSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors); return;
    }
    setSaving(true);
    try {
      const saveLunch = async (barberId: string) => {
        if (!tenantId) return;
        const key = `barber_lunch_${barberId}`;
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("key", key)
          .maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value: JSON.stringify(lunchForm), updated_at: new Date().toISOString() } as any).eq("id", existing.id);
        } else {
          await supabase.from("site_settings").insert({ key, value: JSON.stringify(lunchForm), tenant_id: tenantId } as any);
        }
      };

      if (editingId) {
        const photoUrl = await uploadPhoto(editingId);
        await updateBarber(editingId, { ...parsed.data, ...(photoUrl ? { photo_url: photoUrl } : {}) });
        await upsertAvailability(availForm.map((a, i) => ({ barber_id: editingId, day_of_week: i, tenant_id: tenantId || undefined, ...a })));
        await saveLunch(editingId);
        toast.success(`${nicheLabels.staffSingular} atualizado!`);
      } else {
        const { data: newBarber, error } = await supabase
          .from("barbers" as any).insert({ ...parsed.data, tenant_id: tenantId } as any).select("id").single();
        if (error) throw error;
        const barberId = (newBarber as any).id;
        const photoUrl = await uploadPhoto(barberId);
        if (photoUrl) {
          await updateBarber(barberId, { photo_url: photoUrl });
        }
        await upsertAvailability(availForm.map((a, i) => ({ barber_id: barberId, day_of_week: i, tenant_id: tenantId || undefined, ...a })));
        await saveLunch(barberId);
        toast.success("Barbeiro criado!");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  const handleToggleActive = async (b: DbBarber) => {
    try {
      await updateBarber(b.id, { active: !b.active });
      toast.success(b.active ? "Barbeiro desativado" : "Barbeiro ativado");
      loadData();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este barbeiro?")) return;
    try {
      // Delete related availability records first
      await supabase.from("barber_availability" as any).delete().eq("barber_id", id);
      // Delete related reviews
      await supabase.from("reviews" as any).delete().eq("barber_id", id);
      // Delete related appointments
      await supabase.from("appointments" as any).delete().eq("barber_id", id);
      // Now delete the barber
      await deleteBarber(id);
      toast.success("Barbeiro excluído!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    }
  };

  const updateAvailDay = (index: number, updates: Partial<AvailForm>) => {
    setAvailForm(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const openCredentials = (b: DbBarber) => {
    setCredBarberId(b.id);
    setCredBarberName(b.name);
    setCredHasUser(!!b.user_id);
    setCredEmail("");
    setCredPassword("");
    setCredShowPw(false);
    setCredDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!credBarberId || !credEmail || !credPassword) {
      toast.error("Preencha email e senha");
      return;
    }
    if (credPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setCredSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-barber-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ barber_id: credBarberId, email: credEmail, password: credPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar");
      toast.success(result.message || "Acesso salvo!");
      setCredDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
    setCredSaving(false);
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Barbeiros</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua equipe</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="grid gap-4">
        {barbers.map((b) => {
          const barberAvail = availability.filter(a => a.barber_id === b.id);
          return (
            <div key={b.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start gap-4">
                {b.photo_url ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                    <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold flex-shrink-0">{b.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                    <Badge variant="outline" className={b.active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                      {b.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{b.specialty}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6].map(d => {
                      const avail = barberAvail.find(a => a.day_of_week === d && a.active);
                      return (
                        <span key={d} className={`text-xs px-2 py-1 rounded ${avail ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"}`}>
                          {diasSemana[d]}
                          {avail && <span className="ml-1 text-muted-foreground">{avail.start_time?.slice(0, 5)}-{avail.end_time?.slice(0, 5)}</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCredentials(b)} title="Acesso do barbeiro">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(b)}><Power className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Barbeiro" : "Novo Barbeiro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Foto</label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {photoPreview ? "Trocar foto" : "Escolher foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Máx 5MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do barbeiro" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Especialidade</label>
              <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Degradê & Cortes Modernos" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Disponibilidade</label>
              <div className="space-y-2">
                {diasSemana.map((dia, i) => (
                  <div key={dia} className="flex items-center gap-3">
                    <Switch checked={availForm[i].active} onCheckedChange={v => updateAvailDay(i, { active: v })} />
                    <span className="w-10 text-sm font-medium">{dia}</span>
                    <Input type="time" value={availForm[i].start_time} onChange={e => updateAvailDay(i, { start_time: e.target.value })} disabled={!availForm[i].active} className="w-28 text-sm" />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input type="time" value={availForm[i].end_time} onChange={e => updateAvailDay(i, { end_time: e.target.value })} disabled={!availForm[i].active} className="w-28 text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Intervalo / Almoço</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Switch checked={lunchForm.enabled} onCheckedChange={v => setLunchForm(prev => ({ ...prev, enabled: v }))} />
                  <span className="text-sm font-medium">Habilitar intervalo</span>
                </div>
                {lunchForm.enabled && (
                  <div className="flex items-center gap-3 ml-12">
                    <Input type="time" value={lunchForm.start} onChange={e => setLunchForm(prev => ({ ...prev, start: e.target.value }))} className="w-28 text-sm" />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input type="time" value={lunchForm.end} onChange={e => setLunchForm(prev => ({ ...prev, end: e.target.value }))} className="w-28 text-sm" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credential Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {credHasUser ? "Atualizar Acesso" : "Criar Acesso"} — {credBarberName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {credHasUser && (
              <p className="text-sm text-muted-foreground">
                Este barbeiro já possui acesso. Preencha para atualizar email e/ou senha.
              </p>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={credEmail}
                onChange={e => setCredEmail(e.target.value)}
                placeholder="email@exemplo.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Senha</label>
              <div className="relative">
                <Input
                  type={credShowPw ? "text" : "password"}
                  value={credPassword}
                  onChange={e => setCredPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setCredShowPw(!credShowPw)}
                >
                  {credShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCredDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCredentials} disabled={credSaving}>
                {credSaving ? "Salvando..." : credHasUser ? "Atualizar" : "Criar Acesso"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBarbeiros;
