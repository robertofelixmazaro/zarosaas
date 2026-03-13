import { useEffect, useState, useRef } from "react";
import { Settings, Clock, Calendar, Save, Upload, X, Image, Mail, Lock, User, Eye, EyeOff, QrCode, Download, Truck, MessageSquare, CreditCard, Bell, Store, Globe, Loader2 } from "lucide-react";
import WhatsAppNotificationConfig from "@/components/admin/WhatsAppNotificationConfig";
import PushNotificationSection from "@/components/admin/PushNotificationSection";
import ReminderChannelConfig from "@/components/admin/ReminderChannelConfig";
import EmailTemplatesEditor from "@/components/admin/EmailTemplatesEditor";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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


  // Mercado Pago credentials
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [savingMp, setSavingMp] = useState(false);

  // No-show policy
  const [noShowEnabled, setNoShowEnabled] = useState(false);
  const [noShowDeposit, setNoShowDeposit] = useState("0");
  const [noShowRetention, setNoShowRetention] = useState("100");
  const [noShowCancelHours, setNoShowCancelHours] = useState("4");
  const [savingNoShow, setSavingNoShow] = useState(false);

  // Marketplace visibility
  const [marketplaceVisible, setMarketplaceVisible] = useState(false);
  const [city, setCity] = useState("");
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [marketplaceLogoFile, setMarketplaceLogoFile] = useState<File | null>(null);
  const [marketplaceLogoPreview, setMarketplaceLogoPreview] = useState<string | null>(null);
  const marketplaceLogoInputRef = useRef<HTMLInputElement>(null);

  // Custom domain
  const [customDomain, setCustomDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);

  const loadData = async () => {
    const [settingsRes] = await Promise.all([
      supabase.from("site_settings" as any).select("key, value").eq("tenant_id", tenantId),
    ]);
    if (settingsRes.data) {
      const map: Record<string, string> = {};
      (settingsRes.data as any[]).forEach((r) => { map[r.key] = r.value; });
      setSettings((prev) => ({ ...prev, ...map } as SiteSettings));
      if (map.logo_url) setLogoPreview(map.logo_url);
      if (map.cover_image_url) setCoverPreview(map.cover_image_url);
    }
    // Load MP credentials from tenant_secrets (secure)
    const { data: mpSecrets } = await supabase
      .from("tenant_secrets" as any)
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["mercadopago_access_token", "mercadopago_public_key"]);
    if (mpSecrets) {
      const secretMap: Record<string, string> = {};
      (mpSecrets as any[]).forEach((s: any) => { secretMap[s.key] = s.value; });
      setMpAccessToken(secretMap.mercadopago_access_token || "");
      setMpPublicKey(secretMap.mercadopago_public_key || "");
    }
    // Load no-show settings and marketplace settings from tenant
    const { data: tenantData } = await supabase
      .from("tenants" as any)
      .select("no_show_enabled, no_show_deposit_value, no_show_retention_percentage, no_show_cancel_limit_hours, marketplace_visible, city, custom_domain, marketplace_logo_url")
      .eq("id", tenantId)
      .maybeSingle();
    if (tenantData) {
      setNoShowEnabled((tenantData as any).no_show_enabled || false);
      setNoShowDeposit(String((tenantData as any).no_show_deposit_value || 0));
      setNoShowRetention(String((tenantData as any).no_show_retention_percentage || 100));
      setNoShowCancelHours(String((tenantData as any).no_show_cancel_limit_hours || 4));
      setMarketplaceVisible((tenantData as any).marketplace_visible || false);
      setCity((tenantData as any).city || "");
      setCustomDomain((tenantData as any).custom_domain || "");
    }

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

      const rows = Object.entries(settingsToSave)
        .filter(([key, value]) => !(!value && (key === "logo_url" || key === "cover_image_url")))
        .map(([key, value]) => ({
          key,
          value: String(value),
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        }));

      const { error: upsertErr } = await supabase
        .from("site_settings" as any)
        .upsert(rows as any, { onConflict: "key,tenant_id" });
      if (upsertErr) throw new Error(`Erro ao salvar: ${upsertErr.message}`);
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

      {/* Política de No-Show */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5" />
          <h3 className="font-semibold">Política de No-Show (Garantia de Agendamento)</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure a política de cobrança por ausência. Quando ativada, os clientes precisarão pagar uma garantia ao agendar.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={noShowEnabled} onCheckedChange={setNoShowEnabled} />
            <span className="text-sm font-medium">Ativar política de no-show</span>
          </div>
          {noShowEnabled && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor da garantia (R$)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={noShowDeposit}
                  onChange={(e) => setNoShowDeposit(e.target.value)}
                  placeholder="Ex: 20.00"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor cobrado como garantia no agendamento</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Percentual de retenção (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={noShowRetention}
                  onChange={(e) => setNoShowRetention(e.target.value)}
                  placeholder="Ex: 50"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Percentual retido em caso de no-show</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Prazo para cancelamento sem multa (horas)</label>
                <Input
                  type="number"
                  min="0"
                  value={noShowCancelHours}
                  onChange={(e) => setNoShowCancelHours(e.target.value)}
                  placeholder="Ex: 4"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Horas antes do agendamento em que o cancelamento é gratuito</p>
              </div>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={savingNoShow}
            onClick={async () => {
              setSavingNoShow(true);
              try {
                const { error } = await supabase
                  .from("tenants" as any)
                  .update({
                    no_show_enabled: noShowEnabled,
                    no_show_deposit_value: Number(noShowDeposit) || 0,
                    no_show_retention_percentage: Number(noShowRetention) || 100,
                    no_show_cancel_limit_hours: Number(noShowCancelHours) || 4,
                  } as any)
                  .eq("id", tenantId);
                if (error) throw error;
                toast.success("Política de no-show salva!");
              } catch (err: any) {
                toast.error("Erro ao salvar", { description: err.message });
              }
              setSavingNoShow(false);
            }}
          >
            {savingNoShow ? "Salvando..." : "Salvar Política de No-Show"}
          </Button>
        </div>
      </div>

      {/* Marketplace Visibility */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-5 w-5" />
          <h3 className="font-semibold">Marketplace — Visibilidade Pública</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ao ativar, sua empresa aparecerá no catálogo público de empresas do Zaro, permitindo que novos clientes encontrem e agendem com você.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={marketplaceVisible} onCheckedChange={setMarketplaceVisible} />
            <span className="text-sm font-medium">Mostrar empresa no marketplace</span>
          </div>
          {marketplaceVisible && (
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Exibida para clientes no marketplace</p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={savingMarketplace}
            onClick={async () => {
              setSavingMarketplace(true);
              try {
                const { error } = await supabase
                  .from("tenants" as any)
                  .update({
                    marketplace_visible: marketplaceVisible,
                    city: city || null,
                  } as any)
                  .eq("id", tenantId);
                if (error) throw error;
                toast.success("Configurações do marketplace salvas!");
              } catch (err: any) {
                toast.error("Erro ao salvar", { description: err.message });
              }
              setSavingMarketplace(false);
            }}
          >
            {savingMarketplace ? "Salvando..." : "Salvar Configurações do Marketplace"}
          </Button>
          {marketplaceVisible && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              💡 Dica: Sua empresa aparecerá em{" "}
              <a href="/explorar" target="_blank" className="text-primary hover:underline">
                zarosistemas.com.br/explorar
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Custom Domain */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" />
          <h3 className="font-semibold">Domínio Personalizado</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Conecte um domínio próprio para que seus clientes acessem sua página de agendamento diretamente.
          Exemplo: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">agenda.meudominio.com.br</code>
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Domínio</label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
              placeholder="agenda.meudominio.com.br"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Configure um registro CNAME apontando seu domínio para <code className="bg-muted px-1 py-0.5 rounded">zarosistemas.com.br</code>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={savingDomain}
            onClick={async () => {
              setSavingDomain(true);
              try {
                // Check uniqueness if domain is set
                if (customDomain) {
                  const { data: existing } = await supabase
                    .from("tenants" as any)
                    .select("id")
                    .eq("custom_domain", customDomain)
                    .neq("id", tenantId)
                    .maybeSingle();
                  if (existing) {
                    toast.error("Este domínio já está em uso por outra empresa.");
                    setSavingDomain(false);
                    return;
                  }
                }
                const { error } = await supabase
                  .from("tenants" as any)
                  .update({ custom_domain: customDomain || null } as any)
                  .eq("id", tenantId);
                if (error) throw error;
                toast.success("Domínio personalizado salvo!");
              } catch (err: any) {
                toast.error("Erro ao salvar", { description: err.message });
              }
              setSavingDomain(false);
            }}
          >
            {savingDomain ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Domínio"}
          </Button>
          {customDomain && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Configuração DNS necessária:</p>
              <div className="space-y-1 text-xs font-mono">
                <p><span className="text-muted-foreground">Tipo:</span> CNAME</p>
                <p><span className="text-muted-foreground">Nome:</span> {customDomain.split('.')[0]}</p>
                <p><span className="text-muted-foreground">Valor:</span> zarosistemas.com.br</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Após configurar o DNS, seu site estará acessível em{" "}
                <a href={`https://${customDomain}`} target="_blank" className="text-primary hover:underline">
                  {customDomain}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <ReminderChannelConfig />

      {/* WhatsApp Notifications */}
      <WhatsAppNotificationConfig />

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

      {/* Mercado Pago */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          <h3 className="font-semibold">Pagamentos — Mercado Pago</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Conecte sua conta do Mercado Pago para receber pagamentos diretamente. Os valores serão depositados na sua conta.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Access Token</label>
            <Input
              type="password"
              value={mpAccessToken}
              onChange={(e) => setMpAccessToken(e.target.value)}
              placeholder="APP_USR-..."
            />
            <p className="text-xs text-muted-foreground mt-1">Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais de produção</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Public Key</label>
            <Input
              type="password"
              value={mpPublicKey}
              onChange={(e) => setMpPublicKey(e.target.value)}
              placeholder="APP_USR-..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={savingMp}
            onClick={async () => {
              setSavingMp(true);
              try {
                const upsertSecret = async (key: string, value: string) => {
                  if (value) {
                    const { error } = await supabase
                      .from("tenant_secrets" as any)
                      .upsert({ tenant_id: tenantId, key, value } as any, { onConflict: "tenant_id,key" });
                    if (error) throw error;
                  }
                };
                await upsertSecret("mercadopago_access_token", mpAccessToken);
                await upsertSecret("mercadopago_public_key", mpPublicKey);
                toast.success("Credenciais do Mercado Pago salvas!");
              } catch (err: any) {
                toast.error("Erro ao salvar", { description: err.message });
              }
              setSavingMp(false);
            }}
          >
            {savingMp ? "Salvando..." : "Salvar Credenciais MP"}
          </Button>
        </div>
      </div>

      {/* Push Notifications */}
      <PushNotificationSection />

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
              value={getTenantExternalUrl(tenant?.slug || "")}
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
            value={getTenantExternalUrl(tenant?.slug || "")}
            size={1024}
            level="H"
            includeMargin
            fgColor="#000000"
            bgColor="#ffffff"
            imageSettings={logoPreview ? { src: logoPreview, height: 200, width: 200, excavate: true, x: undefined, y: undefined } : undefined}
          />
        </div>
      </div>

      {/* Email Templates */}
      <EmailTemplatesEditor />

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
};

export default AdminConfig;
