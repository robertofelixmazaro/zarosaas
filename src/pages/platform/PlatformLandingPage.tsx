import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, ExternalLink, Video, Globe, Type, Image, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SETTING_KEYS = [
  "landing_video_url",
  "landing_hero_title",
  "landing_hero_subtitle",
  "landing_benefits_title",
  "landing_cta_title",
  "landing_cta_subtitle",
  "landing_hero_image_url",
] as const;

type SettingsMap = Record<string, string>;

const PlatformLandingPage = () => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    loadSettings();
    loadImages();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [...SETTING_KEYS]);
    const map: SettingsMap = {};
    data?.forEach((row) => { map[row.key] = row.value; });
    setSettings(map);
    setLoading(false);
  };

  const loadImages = async () => {
    const { data } = await supabase.storage.from("landing-assets").list("", { limit: 50 });
    if (data) {
      setImages(
        data
          .filter((f) => !f.name.startsWith("."))
          .map((f) => ({
            name: f.name,
            url: supabase.storage.from("landing-assets").getPublicUrl(f.name).data.publicUrl,
          }))
      );
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of SETTING_KEYS) {
        const value = settings[key] || "";
        const { data: existing } = await supabase
          .from("platform_settings")
          .select("id")
          .eq("key", key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("platform_settings")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else if (value) {
          await supabase
            .from("platform_settings")
            .insert({ key, value });
        }
      }
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(fileName, file, { upsert: true });
    if (error) {
      toast.error("Erro no upload: " + error.message);
    } else {
      toast.success("Imagem enviada!");
      await loadImages();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteImage = async (name: string) => {
    const { error } = await supabase.storage.from("landing-assets").remove([name]);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Imagem excluída!");
      setImages((prev) => prev.filter((img) => img.name !== name));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  const getEmbedPreview = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (url.endsWith(".mp4")) return url;
    return null;
  };

  const embedUrl = getEmbedPreview(settings.landing_video_url || "");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe className="h-5 w-5" /> Gerenciamento da Landing Page
        </h2>
        <p className="text-sm text-muted-foreground">Edite o conteúdo e mídia da página principal do SaaS</p>
      </div>

      {/* Ver Landing */}
      <Card>
        <CardContent className="pt-6">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Ver Landing Page
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Conteúdo textual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" /> Conteúdo da Landing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título Principal (Hero)</Label>
            <Input
              value={settings.landing_hero_title || ""}
              onChange={(e) => updateSetting("landing_hero_title", e.target.value)}
              placeholder="Automatize os agendamentos do seu negócio..."
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo (Hero)</Label>
            <Textarea
              value={settings.landing_hero_subtitle || ""}
              onChange={(e) => updateSetting("landing_hero_subtitle", e.target.value)}
              placeholder="Sistema completo para barbearias, clínicas..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Título da Seção de Benefícios</Label>
            <Input
              value={settings.landing_benefits_title || ""}
              onChange={(e) => updateSetting("landing_benefits_title", e.target.value)}
              placeholder="Tudo que você precisa para organizar e crescer seu negócio"
            />
          </div>
          <div className="space-y-2">
            <Label>Título da Chamada Final</Label>
            <Input
              value={settings.landing_cta_title || ""}
              onChange={(e) => updateSetting("landing_cta_title", e.target.value)}
              placeholder="Pronto para organizar seu negócio?"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo da Chamada Final</Label>
            <Textarea
              value={settings.landing_cta_subtitle || ""}
              onChange={(e) => updateSetting("landing_cta_subtitle", e.target.value)}
              placeholder="Crie sua página de agendamento e comece a receber clientes hoje mesmo."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vídeo Explicativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" /> Vídeo Explicativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Vídeo</Label>
            <Input
              value={settings.landing_video_url || ""}
              onChange={(e) => updateSetting("landing_video_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              YouTube, Vimeo ou URL direta MP4. Deixe vazio para ocultar.
            </p>
          </div>
          {embedUrl && (
            <div className="rounded-lg overflow-hidden border aspect-video bg-muted">
              {embedUrl.endsWith(".mp4") ? (
                <video src={embedUrl} controls className="w-full h-full object-contain" />
              ) : (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Preview do vídeo"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banco de Imagens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" /> Banco de Imagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL da Imagem do Hero</Label>
            <Input
              value={settings.landing_hero_image_url || ""}
              onChange={(e) => updateSetting("landing_hero_image_url", e.target.value)}
              placeholder="Cole a URL de uma imagem ou faça upload abaixo"
            />
            <p className="text-xs text-muted-foreground">
              Imagem exibida na seção principal da landing page.
            </p>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-2 block">Upload de Imagens</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Enviando..." : "Enviar imagem"}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {images.map((img) => (
                <div key={img.name} className="relative group rounded-lg overflow-hidden border bg-muted">
                  <img src={img.url} alt={img.name} className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => copyUrl(img.url)} title="Copiar URL">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteImage(img.name)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate px-2 py-1">{img.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving} className="gap-2" size="lg">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar todas as configurações"}
        </Button>
      </div>
    </div>
  );
};

export default PlatformLandingPage;
