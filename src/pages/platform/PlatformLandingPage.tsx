import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, ExternalLink, Video, Globe, Type, Upload, Trash2, Loader2, Image, Building2, GripVertical, Plus } from "lucide-react";
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

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Gallery videos
  const [galleryVideos, setGalleryVideos] = useState<any[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");

  // Client logos
  const [clientLogos, setClientLogos] = useState<any[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [newLogoName, setNewLogoName] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([loadSettings(), loadGalleryImages(), loadGalleryVideos(), loadClientLogos()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [...SETTING_KEYS]);
    const map: SettingsMap = {};
    data?.forEach((row) => { map[row.key] = row.value; });
    setSettings(map);
  };

  const loadGalleryImages = async () => {
    const { data } = await supabase
      .from("landing_gallery_images" as any)
      .select("*")
      .order("ordem", { ascending: true });
    setGalleryImages((data as any[]) || []);
  };

  const loadGalleryVideos = async () => {
    const { data } = await supabase
      .from("landing_gallery_videos" as any)
      .select("*")
      .order("created_at", { ascending: true });
    setGalleryVideos((data as any[]) || []);
  };

  const loadClientLogos = async () => {
    const { data } = await supabase
      .from("landing_clients_logos" as any)
      .select("*")
      .order("created_at", { ascending: true });
    setClientLogos((data as any[]) || []);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
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
          await supabase.from("platform_settings").update({ value, updated_at: new Date().toISOString() }).eq("id", existing.id);
        } else if (value) {
          await supabase.from("platform_settings").insert({ key, value });
        }
      }
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  // === Gallery Images ===
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("landing-assets").upload(fileName, file, { upsert: true });
      if (uploadError) {
        toast.error("Erro no upload: " + uploadError.message);
        continue;
      }
      const url = supabase.storage.from("landing-assets").getPublicUrl(fileName).data.publicUrl;
      await supabase.from("landing_gallery_images" as any).insert({ image_url: url, ordem: galleryImages.length } as any);
    }
    toast.success("Imagens enviadas!");
    await loadGalleryImages();
    setUploadingImage(false);
    e.target.value = "";
  };

  const handleDeleteGalleryImage = async (id: string) => {
    await supabase.from("landing_gallery_images" as any).delete().eq("id", id);
    setGalleryImages((prev) => prev.filter((img) => img.id !== id));
    toast.success("Imagem removida!");
  };

  // === Gallery Videos ===
  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) return toast.error("Informe a URL do vídeo");
    await supabase.from("landing_gallery_videos" as any).insert({ video_url: newVideoUrl.trim(), titulo: newVideoTitle.trim() || null } as any);
    setNewVideoUrl("");
    setNewVideoTitle("");
    toast.success("Vídeo adicionado!");
    await loadGalleryVideos();
  };

  const handleDeleteVideo = async (id: string) => {
    await supabase.from("landing_gallery_videos" as any).delete().eq("id", id);
    setGalleryVideos((prev) => prev.filter((v) => v.id !== id));
    toast.success("Vídeo removido!");
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

  // === Client Logos ===
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleAddLogo = async () => {
    if (!newLogoName.trim()) return toast.error("Informe o nome da empresa");
    if (!logoFile) return toast.error("Selecione uma imagem para o logo");
    setUploadingLogo(true);
    const ext = logoFile.name.split(".").pop();
    const fileName = `client-logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("landing-assets").upload(fileName, logoFile, { upsert: true });
    if (uploadError) {
      toast.error("Erro no upload: " + uploadError.message);
      setUploadingLogo(false);
      return;
    }
    const url = supabase.storage.from("landing-assets").getPublicUrl(fileName).data.publicUrl;
    await supabase.from("landing_clients_logos" as any).insert({ logo_url: url, empresa_nome: newLogoName.trim() } as any);
    setNewLogoName("");
    setLogoFile(null);
    setLogoPreview(null);
    toast.success("Logo adicionado!");
    await loadClientLogos();
    setUploadingLogo(false);
  };

  const handleDeleteLogo = async (id: string) => {
    await supabase.from("landing_clients_logos" as any).delete().eq("id", id);
    setClientLogos((prev) => prev.filter((l) => l.id !== id));
    toast.success("Logo removido!");
  };

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
        <p className="text-sm text-muted-foreground">Edite o conteúdo, mídia e seções da página principal do SaaS</p>
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
            <Input value={settings.landing_hero_title || ""} onChange={(e) => updateSetting("landing_hero_title", e.target.value)} placeholder="Automatize os agendamentos do seu negócio..." />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo (Hero)</Label>
            <Textarea value={settings.landing_hero_subtitle || ""} onChange={(e) => updateSetting("landing_hero_subtitle", e.target.value)} placeholder="Sistema completo para barbearias, clínicas..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Título da Seção de Benefícios</Label>
            <Input value={settings.landing_benefits_title || ""} onChange={(e) => updateSetting("landing_benefits_title", e.target.value)} placeholder="Tudo que você precisa para organizar e crescer" />
          </div>
          <div className="space-y-2">
            <Label>Título da Chamada Final</Label>
            <Input value={settings.landing_cta_title || ""} onChange={(e) => updateSetting("landing_cta_title", e.target.value)} placeholder="Pronto para organizar seu negócio?" />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo da Chamada Final</Label>
            <Textarea value={settings.landing_cta_subtitle || ""} onChange={(e) => updateSetting("landing_cta_subtitle", e.target.value)} placeholder="Crie sua página de agendamento..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>URL da Imagem do Hero</Label>
            <Input value={settings.landing_hero_image_url || ""} onChange={(e) => updateSetting("landing_hero_image_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar conteúdo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== GALERIA DE IMAGENS ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" /> Galeria de Imagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Imagens exibidas em formato de galeria na landing page.</p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingImage ? "Enviando..." : "Enviar imagens"}
                </span>
              </Button>
            </label>
          </div>
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {galleryImages.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted">
                  <img src={img.image_url} alt="Galeria" className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteGalleryImage(img.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {galleryImages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem na galeria.</p>}
        </CardContent>
      </Card>

      {/* ===== GALERIA DE VÍDEOS ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" /> Galeria de Vídeos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Vídeos de demonstração exibidos na landing page. YouTube, Vimeo ou MP4.</p>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Título do vídeo (opcional)</Label>
              <Input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="Ex: Como funciona o Zaro" />
            </div>
            <div className="space-y-2">
              <Label>URL do Vídeo</Label>
              <div className="flex gap-2">
                <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="flex-1" />
                <Button onClick={handleAddVideo} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>
          </div>
          {galleryVideos.length > 0 && (
            <div className="space-y-3 pt-2">
              {galleryVideos.map((v) => {
                const embed = getEmbedPreview(v.video_url);
                return (
                  <div key={v.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.titulo || "Sem título"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{v.video_url}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteVideo(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {embed && (
                      <div className="rounded overflow-hidden border aspect-video bg-muted">
                        {embed.endsWith(".mp4") ? (
                          <video src={embed} controls className="w-full h-full object-contain" />
                        ) : (
                          <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Preview" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {galleryVideos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum vídeo adicionado.</p>}
        </CardContent>
      </Card>

      {/* ===== CLIENTES ATIVOS (LOGOS) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Clientes Ativos (Logos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Logos exibidos na seção "Empresas que confiam no Zaro" da landing page.</p>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input value={newLogoName} onChange={(e) => setNewLogoName(e.target.value)} placeholder="Ex: Barbearia Elite" />
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <span>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Enviando..." : "Enviar logo"}
                  </span>
                </Button>
              </label>
            </div>
          </div>
          {clientLogos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {clientLogos.map((logo) => (
                <div key={logo.id} className="relative group rounded-lg overflow-hidden border bg-muted p-3 flex flex-col items-center gap-2">
                  <img src={logo.logo_url} alt={logo.empresa_nome} className="w-16 h-16 object-contain" />
                  <p className="text-xs font-medium text-center truncate w-full">{logo.empresa_nome}</p>
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteLogo(logo.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {clientLogos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum logo adicionado.</p>}
        </CardContent>
      </Card>

      <div className="pb-6" />
    </div>
  );
};

export default PlatformLandingPage;
