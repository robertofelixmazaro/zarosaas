import { useEffect, useState, useRef } from "react";
import { Settings, Clock, Calendar, Save, Upload, X, Image, Plus, Trash2, Mail, Lock, User, Eye, EyeOff, CalendarRange, QrCode, Download, Truck } from "lucide-react";
import { addDays, addMonths, addYears, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllBarbers, DbBarber } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SiteSettings {
  shop_name: string;
  phone: string;
  address: string;
  instagram: string;
  whatsapp: string;
  description: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
  logo_url: string;
  cover_image_url: string;
  delivery_fee: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  whatsapp_default_message: string;
}

const defaultSettings: SiteSettings = {
  shop_name: "",
  phone: "",
  address: "",
  instagram: "",
  whatsapp: "",
  description: "",
  hours_weekday: "",
  hours_saturday: "",
  hours_sunday: "",
  logo_url: "",
  cover_image_url: "",
  delivery_fee: "0",
  primary_color: "",
  secondary_color: "",
  button_color: "",
  whatsapp_default_message: "Olá {{cliente}}, estou entrando em contato sobre seu agendamento de {{servico}} marcado para {{data}} às {{hora}}. — {{empresa}}",
};

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  barber_id: string | null;
}

const AdminConfig = () => {
  const { user } = useAuth();
  const { tenantId, tenant } = useTenant();
  const [settings, setSettings] = useState<SiteSettings>({
    ...defaultSettings,
    shop_name: tenant?.name || "",
    phone: tenant?.phone || "",
    address: tenant?.address || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Account settings
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: "", reason: "", all_day: true, start_time: "08:00", end_time: "18:00", block_mode: "single" as "single" | "week" | "month" | "year", barber_id: "" as string });
  const [savingBlock, setSavingBlock] = useState(false);
  const [barbersList, setBarbersList] = useState<DbBarber[]>([]);

  const loadData = async () => {
    const [settingsRes, blockedRes, barbers] = await Promise.all([
      supabase.from("site_settings" as any).select("key, value").eq("tenant_id", tenantId),
      supabase.from("blocked_dates" as any).select("*").eq("tenant_id", tenantId).order("blocked_date"),
      fetchAllBarbers(tenantId || undefined),
    ]);
    if (settingsRes.data) {
      const map: Record<string, string> = {};
      (settingsRes.data as any[]).forEach((r) => { map[r.key] = r.value; });
      setSettings((prev) => ({ ...prev, ...map } as SiteSettings));
      if (map.logo_url) setLogoPreview(map.logo_url);
      if (map.cover_image_url) setCoverPreview(map.cover_image_url);
    }
    if (blockedRes.data) setBlockedDates(blockedRes.data as any);
    setBarbersList(barbers);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 10MB"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !tenantId) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `${tenantId}/logo.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, logoFile, { upsert: true });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/tenant-assets/${path}`;
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile || !tenantId) return null;
    const ext = coverFile.name.split(".").pop();
    const path = `${tenantId}/cover.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, coverFile, { upsert: true });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/tenant-assets/${path}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const coverUrl = await uploadCover();
      const settingsToSave = { ...settings };
      if (logoUrl) settingsToSave.logo_url = logoUrl;
      if (coverUrl) settingsToSave.cover_image_url = coverUrl;

      for (const [key, value] of Object.entries(settingsToSave)) {
        if (!value && (key === "logo_url" || key === "cover_image_url")) continue;
        const { data: existing } = await supabase
          .from("site_settings" as any)
          .select("id")
          .eq("key", key)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (existing) {
          await supabase.from("site_settings" as any).update({ value, updated_at: new Date().toISOString() } as any).eq("id", (existing as any).id);
        } else {
          await supabase.from("site_settings" as any).insert({ key, value, tenant_id: tenantId } as any);
        }
      }
      if (logoUrl) setSettings((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">Configurações</h2>

      {/* Logo */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-5 w-5" />
          <h3 className="font-semibold">Logotipo</h3>
        </div>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border">
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview(null); setSettings((s) => ({ ...s, logo_url: "" })); }}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border-2 border-dashed border-border">
              <Upload className="h-6 w-6" />
            </div>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              {logoPreview ? "Trocar logo" : "Enviar logo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Imagem redonda. JPG, PNG. Máx 5MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        </div>
      </div>

      {/* Info da barbearia */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h3 className="font-semibold">Dados do Negócio</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome</label>
            <Input value={settings.shop_name} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Telefone</label>
            <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Endereço</label>
            <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Instagram</label>
            <Input value={settings.instagram} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">WhatsApp</label>
            <Input value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="(11) 99999-0000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descrição do negócio</label>
            <textarea
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              placeholder="Descreva seu negócio para seus clientes..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Message Template */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Mensagem Padrão do WhatsApp</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Configure a mensagem que será enviada ao clicar no botão WhatsApp nos detalhes do agendamento.
        </p>
        <textarea
          value={settings.whatsapp_default_message}
          onChange={(e) => setSettings({ ...settings, whatsapp_default_message: e.target.value })}
          placeholder="Olá {{cliente}}, seu agendamento de {{servico}} está marcado para {{data}} às {{hora}}."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
        />
        <div className="mt-3 p-3 rounded-lg border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {["{{cliente}}", "{{servico}}", "{{data}}", "{{hora}}", "{{empresa}}"].map((v) => (
              <code key={v} className="text-xs bg-muted px-2 py-1 rounded font-mono">{v}</code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Pré-visualização:</strong>{" "}
            {settings.whatsapp_default_message
              .replace(/\{\{cliente\}\}/g, "João Silva")
              .replace(/\{\{servico\}\}/g, "Corte Masculino")
              .replace(/\{\{data\}\}/g, "15/03/2026")
              .replace(/\{\{hora\}\}/g, "14:00")
              .replace(/\{\{empresa\}\}/g, settings.shop_name || "Minha Empresa")}
          </p>
        </div>
      </div>
      {/* Cover image */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-5 w-5" />
          <h3 className="font-semibold">Imagem de Capa</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Imagem exibida no topo da landing page do seu negócio</p>
        <div className="space-y-3">
          {coverPreview ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden border">
              <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setCoverFile(null); setCoverPreview(null); setSettings((s) => ({ ...s, cover_image_url: "" })); }}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-40 rounded-lg bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">Clique para enviar imagem de capa</span>
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
            {coverPreview ? "Trocar capa" : "Enviar capa"}
          </Button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
        </div>
      </div>

      {/* Branding / Colors */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h3 className="font-semibold">Cores e Identidade Visual</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Personalize as cores da sua landing page. Deixe em branco para usar o tema padrão.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Cor primária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primary_color || "#000000"}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor secundária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.secondary_color || "#666666"}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                placeholder="#666666"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor dos botões</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.button_color || "#000000"}
                onChange={(e) => setSettings({ ...settings, button_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={settings.button_color}
                onChange={(e) => setSettings({ ...settings, button_color: e.target.value })}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
        </div>
        {(settings.primary_color || settings.secondary_color || settings.button_color) && (
          <div className="mt-4 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: settings.primary_color || '#000' }} title="Primária" />
              <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: settings.secondary_color || '#666' }} title="Secundária" />
              <button
                className="px-4 py-1.5 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: settings.button_color || '#000' }}
              >
                Botão exemplo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Horário de funcionamento */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">Horário de Funcionamento</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Dias de semana</label>
            <Input value={settings.hours_weekday} onChange={(e) => setSettings({ ...settings, hours_weekday: e.target.value })} placeholder="Ex: Segunda a Sexta: 08:00 - 20:00" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Sábado</label>
            <Input value={settings.hours_saturday} onChange={(e) => setSettings({ ...settings, hours_saturday: e.target.value })} placeholder="Ex: Sábado: 09:00 - 15:00" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Domingo</label>
            <Input value={settings.hours_sunday} onChange={(e) => setSettings({ ...settings, hours_sunday: e.target.value })} placeholder="Ex: Domingo: Fechado" />
          </div>
        </div>
      </div>

      {/* Taxa de entrega */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5" />
          <h3 className="font-semibold">Taxa de Entrega</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Valor cobrado para entregas de produtos. Deixe 0 para entrega gratuita.</p>
        <div>
          <label className="text-sm font-medium mb-1 block">Valor da entrega (R$)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={settings.delivery_fee}
            onChange={(e) => setSettings({ ...settings, delivery_fee: e.target.value })}
            placeholder="Ex: 10.00"
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Bloquear datas */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h3 className="font-semibold">Datas e Horários Bloqueados</h3>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowBlockForm(!showBlockForm)}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Bloqueie datas inteiras ou horários específicos para feriados, folgas ou manutenção</p>

        {showBlockForm && (
          <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
            {/* Block mode selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período do bloqueio</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "single", label: "Data única" },
                  { value: "week", label: "Semana inteira" },
                  { value: "month", label: "Mês inteiro" },
                  { value: "year", label: "Ano inteiro" },
                ] as const).map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={blockForm.block_mode === opt.value ? "default" : "outline"}
                    onClick={() => setBlockForm({ ...blockForm, block_mode: opt.value })}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Barber selector */}
            <div>
              <label className="text-sm font-medium mb-1 block">Barbeiro</label>
              <Select value={blockForm.barber_id} onValueChange={(v) => setBlockForm({ ...blockForm, barber_id: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todos (geral)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (bloqueio geral)</SelectItem>
                  {barbersList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Deixe "Todos" para bloquear para todo o negócio</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {blockForm.block_mode === "single" ? "Data" : blockForm.block_mode === "week" ? "Qualquer dia da semana" : blockForm.block_mode === "month" ? "Qualquer dia do mês" : "Qualquer dia do ano"}
                  {blockForm.block_mode !== "single" && " *"}
                </label>
                <Input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
                {blockForm.block_mode === "single" && !blockForm.date && (
                  <p className="text-xs text-muted-foreground mt-1">Deixe vazio para bloquear permanentemente</p>
                )}
                {blockForm.block_mode !== "single" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {blockForm.block_mode === "week" && "Todos os dias da semana desta data serão bloqueados"}
                    {blockForm.block_mode === "month" && "Todos os dias do mês desta data serão bloqueados"}
                    {blockForm.block_mode === "year" && "Todos os dias do ano desta data serão bloqueados"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Motivo</label>
                <Input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} placeholder="Ex: Feriado" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={blockForm.all_day} onCheckedChange={(v) => setBlockForm({ ...blockForm, all_day: v })} />
              <span className="text-sm font-medium">Dia inteiro</span>
            </div>
            {!blockForm.all_day && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Início</label>
                  <Input type="time" value={blockForm.start_time} onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })} className="w-32" />
                </div>
                <span className="text-muted-foreground text-sm mt-5">até</span>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fim</label>
                  <Input type="time" value={blockForm.end_time} onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })} className="w-32" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={savingBlock} onClick={async () => {
                if (blockForm.block_mode !== "single" && !blockForm.date) { toast.error("Selecione uma data para bloqueio em período"); return; }
                setSavingBlock(true);
                try {
                  if (blockForm.block_mode === "single" && !blockForm.date) {
                    // Permanent block (no date)
                    const { error } = await supabase.from("blocked_dates" as any).insert({
                      blocked_date: null,
                      reason: blockForm.reason || null,
                      all_day: blockForm.all_day,
                      start_time: blockForm.all_day ? null : blockForm.start_time,
                      end_time: blockForm.all_day ? null : blockForm.end_time,
                      barber_id: blockForm.barber_id || null,
                      tenant_id: tenantId,
                    } as any);
                    if (error) throw error;
                    toast.success("Bloqueio permanente criado!");
                  } else {
                    const refDate = new Date(blockForm.date + "T12:00:00");
                    let dates: Date[] = [];

                    if (blockForm.block_mode === "single") {
                      dates = [refDate];
                    } else if (blockForm.block_mode === "week") {
                      dates = eachDayOfInterval({ start: startOfWeek(refDate, { weekStartsOn: 1 }), end: endOfWeek(refDate, { weekStartsOn: 1 }) });
                    } else if (blockForm.block_mode === "month") {
                      dates = eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) });
                    } else if (blockForm.block_mode === "year") {
                      dates = eachDayOfInterval({ start: startOfYear(refDate), end: endOfYear(refDate) });
                    }

                    const rows = dates.map((d) => ({
                      blocked_date: format(d, "yyyy-MM-dd"),
                      reason: blockForm.reason || null,
                      all_day: blockForm.all_day,
                      start_time: blockForm.all_day ? null : blockForm.start_time,
                      end_time: blockForm.all_day ? null : blockForm.end_time,
                      barber_id: blockForm.barber_id || null,
                      tenant_id: tenantId,
                    }));

                    for (let i = 0; i < rows.length; i += 100) {
                      const batch = rows.slice(i, i + 100);
                      const { error } = await supabase.from("blocked_dates" as any).insert(batch as any);
                      if (error) throw error;
                    }
                    toast.success(`${rows.length} dia(s) bloqueado(s)!`);
                  }
                  setBlockForm({ date: "", reason: "", all_day: true, start_time: "08:00", end_time: "18:00", block_mode: "single", barber_id: "" });
                  setShowBlockForm(false);
                  loadData();
                } catch (err: any) {
                  toast.error("Erro", { description: err.message });
                }
                setSavingBlock(false);
              }}>{savingBlock ? "Salvando..." : "Salvar"}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowBlockForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {blockedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma data bloqueada</p>
        ) : (
          <div className="space-y-2">
            {blockedDates.map((bd) => (
              <div key={bd.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <span className="font-medium text-sm">
                    {bd.blocked_date ? new Date(bd.blocked_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Permanente"}
                  </span>
                  {bd.all_day ? (
                    <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Dia inteiro</span>
                  ) : (
                    <span className="ml-2 text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                      {bd.start_time?.slice(0, 5)} - {bd.end_time?.slice(0, 5)}
                    </span>
                  )}
                  {bd.barber_id && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {barbersList.find((b) => b.id === bd.barber_id)?.name || "Barbeiro"}
                    </span>
                  )}
                  {!bd.barber_id && (
                    <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Geral</span>
                  )}
                  {bd.reason && <span className="ml-2 text-sm text-muted-foreground">— {bd.reason}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                  try {
                    await supabase.from("blocked_dates" as any).delete().eq("id", bd.id);
                    toast.success("Bloqueio removido!");
                    loadData();
                  } catch (err: any) {
                    toast.error("Erro", { description: err.message });
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alterar acesso */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" />
          <h3 className="font-semibold">Alterar Acesso (Login)</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Email atual: <span className="font-medium text-foreground">{user?.email}</span>
        </p>
        <div className="space-y-4">
          {/* Change email */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> Alterar Email</h4>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Novo email"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={savingAccount || !newEmail}
              onClick={async () => {
                setSavingAccount(true);
                const { error } = await supabase.auth.updateUser({ email: newEmail });
                if (error) {
                  toast.error("Erro ao alterar email", { description: error.message });
                } else {
                  toast.success("Email de confirmação enviado!", { description: "Verifique sua caixa de entrada do novo email para confirmar a alteração." });
                  setNewEmail("");
                }
                setSavingAccount(false);
              }}
            >
              Alterar Email
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4" /> Alterar Senha</h4>
            <Input
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              minLength={6}
              className="pr-10"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-[52px] text-muted-foreground hover:text-foreground">
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <div className="relative">
              <Input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                minLength={6}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={savingAccount || !newPassword || newPassword.length < 6}
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  toast.error("As senhas não coincidem");
                  return;
                }
                setSavingAccount(true);
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                  toast.error("Erro ao alterar senha", { description: error.message });
                } else {
                  toast.success("Senha alterada com sucesso!");
                  setNewPassword("");
                  setConfirmPassword("");
                }
                setSavingAccount(false);
              }}
            >
              Alterar Senha
            </Button>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="h-5 w-5" />
          <h3 className="font-semibold">QR Code de Acesso</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Imprima e coloque no seu negócio para os clientes acessarem o site</p>
        <div className="flex items-center gap-6">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={`${window.location.origin}/t/${tenant?.slug || ""}`}
              size={160}
              level="H"
              includeMargin
              fgColor="#000000"
              bgColor="#ffffff"
              imageSettings={logoPreview ? { src: logoPreview, height: 36, width: 36, excavate: true, x: undefined, y: undefined } : undefined}
            />
          </div>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const svg = document.querySelector("#admin-qr-wrapper svg");
              if (!svg) return;
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = 1024; canvas.height = 1024;
              const svgData = new XMLSerializer().serializeToString(svg);
              const img = new window.Image();
              img.onload = () => { ctx?.drawImage(img, 0, 0, 1024, 1024); const a = document.createElement("a"); a.download = `${tenant?.slug || "negocio"}-qrcode.png`; a.href = canvas.toDataURL("image/png"); a.click(); };
              img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
            }}>
              <Download className="h-4 w-4" /> Baixar QR Code
            </Button>
            <p className="text-xs text-muted-foreground">PNG em alta resolução (1024x1024)</p>
          </div>
        </div>
        <div id="admin-qr-wrapper" className="hidden">
          <QRCodeSVG
            value={`${window.location.origin}/t/${tenant?.slug || ""}`}
            size={1024}
            level="H"
            includeMargin
            fgColor="#000000"
            bgColor="#ffffff"
            imageSettings={logoPreview ? { src: logoPreview, height: 200, width: 200, excavate: true, x: undefined, y: undefined } : undefined}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
};

export default AdminConfig;
