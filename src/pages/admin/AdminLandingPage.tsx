import { useEffect, useState, useRef } from "react";
import { Save, Upload, X, Image, ExternalLink, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface LandingSettings {
  shop_name: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  logo_url: string;
  cover_image_url: string;
  cover_image_mobile_url: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
  // Hero buttons
  hero_btn_primary_text: string;
  hero_btn_primary_link: string;
  hero_btn_primary_color: string;
  hero_btn_secondary_text: string;
  hero_btn_secondary_link: string;
  hero_btn_secondary_color: string;
  // Service buttons
  service_btn_text: string;
  service_btn_color: string;
  service_btn_text_color: string;
  // Product buttons
  product_btn_text: string;
  product_btn_color: string;
  product_btn_text_color: string;
  // CTA section
  cta_title: string;
  cta_subtitle: string;
  cta_btn_text: string;
  cta_btn_color: string;
  cta_bg_color: string;
}

const defaults: LandingSettings = {
  shop_name: "", description: "", phone: "", whatsapp: "", address: "", instagram: "",
  logo_url: "", cover_image_url: "", cover_image_mobile_url: "", primary_color: "", secondary_color: "", button_color: "",
  hours_weekday: "", hours_saturday: "", hours_sunday: "",
  hero_btn_primary_text: "", hero_btn_primary_link: "", hero_btn_primary_color: "",
  hero_btn_secondary_text: "", hero_btn_secondary_link: "", hero_btn_secondary_color: "",
  service_btn_text: "", service_btn_color: "", service_btn_text_color: "",
  product_btn_text: "", product_btn_color: "", product_btn_text_color: "",
  cta_title: "", cta_subtitle: "", cta_btn_text: "", cta_btn_color: "", cta_bg_color: "",
};

const AdminLandingPage = () => {
  const { tenantId, tenantSlug, tenant } = useTenant();
  const [settings, setSettings] = useState<LandingSettings>({ ...defaults, shop_name: tenant?.name || "", phone: tenant?.phone || "", address: tenant?.address || "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase.from("site_settings" as any).select("key, value").eq("tenant_id", tenantId);
      if (data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((r) => { map[r.key] = r.value; });
        setSettings((prev) => ({ ...prev, ...map } as LandingSettings));
        if (map.logo_url) setLogoPreview(map.logo_url);
        if (map.cover_image_url) setCoverPreview(map.cover_image_url);
      }
      setLoading(false);
    })();
  }, [tenantId]);

  const handleFileSelect = (file: File | undefined, type: "logo" | "cover") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    const maxMB = type === "logo" ? 5 : 10;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`Máximo ${maxMB}MB`); return; }
    if (type === "logo") { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
    else { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const uploadFile = async (file: File | null, name: string): Promise<string | null> => {
    if (!file || !tenantId) return null;
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${name}.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/tenant-assets/${path}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const logoUrl = await uploadFile(logoFile, "logo");
      const coverUrl = await uploadFile(coverFile, "cover");
      const toSave = { ...settings };
      if (logoUrl) toSave.logo_url = logoUrl;
      if (coverUrl) toSave.cover_image_url = coverUrl;

      for (const [key, value] of Object.entries(toSave)) {
        if (!value && (key === "logo_url" || key === "cover_image_url")) continue;
        const { data: existing } = await supabase.from("site_settings" as any).select("id").eq("key", key).eq("tenant_id", tenantId).maybeSingle();
        if (existing) {
          await supabase.from("site_settings" as any).update({ value, updated_at: new Date().toISOString() } as any).eq("id", (existing as any).id);
        } else {
          await supabase.from("site_settings" as any).insert({ key, value, tenant_id: tenantId } as any);
        }
      }
      if (logoUrl) setSettings((p) => ({ ...p, logo_url: logoUrl }));
      if (coverUrl) setSettings((p) => ({ ...p, cover_image_url: coverUrl }));
      setLogoFile(null);
      setCoverFile(null);
      toast.success("Landing page atualizada!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Landing Page</h2>
          <p className="text-sm text-muted-foreground">Personalize a página pública do seu negócio</p>
        </div>
        <div className="flex gap-2">
          {tenantSlug && (
            <a href={getTenantExternalUrl(tenantSlug)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" /> Preview
              </Button>
            </a>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Image className="h-4 w-4" /> Logotipo</h3>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border">
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); setSettings((s) => ({ ...s, logo_url: "" })); }}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
              {logoPreview ? "Trocar logo" : "Enviar logo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Máx 5MB</p>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0], "logo")} />
        </div>
      </div>

      {/* Cover */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Image className="h-4 w-4" /> Imagem de Capa</h3>
        {coverPreview ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden border mb-3">
            <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
            <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setSettings((s) => ({ ...s, cover_image_url: "" })); }}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div onClick={() => coverRef.current?.click()} className="w-full h-40 rounded-lg bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors mb-3">
            <Upload className="h-8 w-8 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">Clique para enviar</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => coverRef.current?.click()}>
          {coverPreview ? "Trocar capa" : "Enviar capa"}
        </Button>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0], "cover")} />
      </div>

      {/* Business Info */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold mb-2">Dados do Negócio</h3>
        <div>
          <label className="text-sm font-medium mb-1 block">Nome do negócio</label>
          <Input value={settings.shop_name} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Descrição</label>
          <Textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} placeholder="Descreva seu negócio..." rows={3} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Telefone</label>
            <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">WhatsApp</label>
            <Input value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="(11) 99999-0000" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Endereço</label>
          <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Instagram</label>
          <Input value={settings.instagram} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} />
        </div>
      </div>

      {/* Hours */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold mb-2">Horário de Funcionamento</h3>
        <div>
          <label className="text-sm font-medium mb-1 block">Dias de semana</label>
          <Input value={settings.hours_weekday} onChange={(e) => setSettings({ ...settings, hours_weekday: e.target.value })} placeholder="Segunda a Sexta: 08:00 - 20:00" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Sábado</label>
          <Input value={settings.hours_saturday} onChange={(e) => setSettings({ ...settings, hours_saturday: e.target.value })} placeholder="Sábado: 09:00 - 15:00" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Domingo</label>
          <Input value={settings.hours_sunday} onChange={(e) => setSettings({ ...settings, hours_sunday: e.target.value })} placeholder="Domingo: Fechado" />
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold mb-4">Cores e Identidade Visual</h3>
        <div className="grid grid-cols-3 gap-4">
          {([
            { key: "primary_color" as const, label: "Cor primária", fallback: "#000000" },
            { key: "secondary_color" as const, label: "Cor secundária", fallback: "#666666" },
            { key: "button_color" as const, label: "Cor dos botões", fallback: "#000000" },
          ]).map(({ key, label, fallback }) => (
            <div key={key}>
              <label className="text-sm font-medium mb-1 block">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings[key] || fallback} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} placeholder={fallback} className="flex-1" />
              </div>
            </div>
          ))}
        </div>
        {(settings.primary_color || settings.secondary_color || settings.button_color) && (
          <div className="mt-4 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: settings.primary_color || '#000' }} />
              <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: settings.secondary_color || '#666' }} />
              <button className="px-4 py-1.5 rounded-md text-sm font-medium text-white" style={{ backgroundColor: settings.button_color || '#000' }}>
                Botão exemplo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hero Buttons */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Botões do Topo (Hero)</h3>
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Botão Principal</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Texto</label>
              <Input value={settings.hero_btn_primary_text} onChange={(e) => setSettings({ ...settings, hero_btn_primary_text: e.target.value })} placeholder="Agendar agora" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Link</label>
              <Input value={settings.hero_btn_primary_link} onChange={(e) => setSettings({ ...settings, hero_btn_primary_link: e.target.value })} placeholder="#agendar" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.hero_btn_primary_color || "#000000"} onChange={(e) => setSettings({ ...settings, hero_btn_primary_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.hero_btn_primary_color} onChange={(e) => setSettings({ ...settings, hero_btn_primary_color: e.target.value })} placeholder="#000000" className="flex-1" />
            </div>
          </div>
        </div>
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Botão Secundário</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Texto</label>
              <Input value={settings.hero_btn_secondary_text} onChange={(e) => setSettings({ ...settings, hero_btn_secondary_text: e.target.value })} placeholder="Saiba mais" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Link</label>
              <Input value={settings.hero_btn_secondary_link} onChange={(e) => setSettings({ ...settings, hero_btn_secondary_link: e.target.value })} placeholder="#sobre" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.hero_btn_secondary_color || "#666666"} onChange={(e) => setSettings({ ...settings, hero_btn_secondary_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.hero_btn_secondary_color} onChange={(e) => setSettings({ ...settings, hero_btn_secondary_color: e.target.value })} placeholder="#666666" className="flex-1" />
            </div>
          </div>
        </div>
        {(settings.hero_btn_primary_text || settings.hero_btn_secondary_text) && (
          <div className="mt-3 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            <div className="flex items-center gap-3">
              {settings.hero_btn_primary_text && (
                <button className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ backgroundColor: settings.hero_btn_primary_color || '#000' }}>
                  {settings.hero_btn_primary_text}
                </button>
              )}
              {settings.hero_btn_secondary_text && (
                <button className="px-4 py-2 rounded-md text-sm font-medium text-white" style={{ backgroundColor: settings.hero_btn_secondary_color || '#666' }}>
                  {settings.hero_btn_secondary_text}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Service Buttons */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Botões dos Serviços</h3>
        <div>
          <label className="text-sm font-medium mb-1 block">Texto do botão</label>
          <Input value={settings.service_btn_text} onChange={(e) => setSettings({ ...settings, service_btn_text: e.target.value })} placeholder="Agendar" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do botão</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.service_btn_color || "#000000"} onChange={(e) => setSettings({ ...settings, service_btn_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.service_btn_color} onChange={(e) => setSettings({ ...settings, service_btn_color: e.target.value })} placeholder="#000000" className="flex-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do texto</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.service_btn_text_color || "#FFFFFF"} onChange={(e) => setSettings({ ...settings, service_btn_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.service_btn_text_color} onChange={(e) => setSettings({ ...settings, service_btn_text_color: e.target.value })} placeholder="#FFFFFF" className="flex-1" />
            </div>
          </div>
        </div>
        {settings.service_btn_text && (
          <div className="mt-2 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            <button className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: settings.service_btn_color || '#000', color: settings.service_btn_text_color || '#fff' }}>
              {settings.service_btn_text}
            </button>
          </div>
        )}
      </div>

      {/* Product Buttons */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Botões dos Produtos</h3>
        <div>
          <label className="text-sm font-medium mb-1 block">Texto do botão</label>
          <Input value={settings.product_btn_text} onChange={(e) => setSettings({ ...settings, product_btn_text: e.target.value })} placeholder="Comprar" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do botão</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.product_btn_color || "#000000"} onChange={(e) => setSettings({ ...settings, product_btn_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.product_btn_color} onChange={(e) => setSettings({ ...settings, product_btn_color: e.target.value })} placeholder="#000000" className="flex-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do texto</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.product_btn_text_color || "#FFFFFF"} onChange={(e) => setSettings({ ...settings, product_btn_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.product_btn_text_color} onChange={(e) => setSettings({ ...settings, product_btn_text_color: e.target.value })} placeholder="#FFFFFF" className="flex-1" />
            </div>
          </div>
        </div>
        {settings.product_btn_text && (
          <div className="mt-2 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            <button className="px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: settings.product_btn_color || '#000', color: settings.product_btn_text_color || '#fff' }}>
              {settings.product_btn_text}
            </button>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Chamada Final (CTA)</h3>
        <div>
          <label className="text-sm font-medium mb-1 block">Título da seção</label>
          <Input value={settings.cta_title} onChange={(e) => setSettings({ ...settings, cta_title: e.target.value })} placeholder="Pronto para agendar?" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Subtítulo</label>
          <Input value={settings.cta_subtitle} onChange={(e) => setSettings({ ...settings, cta_subtitle: e.target.value })} placeholder="Entre em contato e agende seu horário" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Texto do botão</label>
          <Input value={settings.cta_btn_text} onChange={(e) => setSettings({ ...settings, cta_btn_text: e.target.value })} placeholder="Agendar agora" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do botão</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.cta_btn_color || "#000000"} onChange={(e) => setSettings({ ...settings, cta_btn_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.cta_btn_color} onChange={(e) => setSettings({ ...settings, cta_btn_color: e.target.value })} placeholder="#000000" className="flex-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cor do fundo</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.cta_bg_color || "#F3F4F6"} onChange={(e) => setSettings({ ...settings, cta_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={settings.cta_bg_color} onChange={(e) => setSettings({ ...settings, cta_bg_color: e.target.value })} placeholder="#F3F4F6" className="flex-1" />
            </div>
          </div>
        </div>
        {(settings.cta_title || settings.cta_btn_text) && (
          <div className="mt-2 p-4 rounded-lg border" style={{ backgroundColor: settings.cta_bg_color || '#F3F4F6' }}>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização:</p>
            {settings.cta_title && <p className="font-bold text-lg mb-1">{settings.cta_title}</p>}
            {settings.cta_subtitle && <p className="text-sm text-muted-foreground mb-3">{settings.cta_subtitle}</p>}
            {settings.cta_btn_text && (
              <button className="px-5 py-2 rounded-md text-sm font-medium text-white" style={{ backgroundColor: settings.cta_btn_color || '#000' }}>
                {settings.cta_btn_text}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminLandingPage;
