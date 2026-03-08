import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, ExternalLink, Video, Globe } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

const PlatformLandingPage = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "landing_video_url")
        .maybeSingle();
      if (data?.value) setVideoUrl(data.value);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("key", "landing_video_url")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("platform_settings")
          .update({ value: videoUrl, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("platform_settings")
          .insert({ key: "landing_video_url", value: videoUrl });
      }
      toast.success("Configuração salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const getEmbedPreview = (url: string) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // MP4
    if (url.endsWith(".mp4")) return url;
    return null;
  };

  const embedUrl = getEmbedPreview(videoUrl);

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/superadmin/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="h-5 w-5" /> Landing Page
            </h2>
            <p className="text-sm text-muted-foreground">Gerencie o conteúdo da página principal do SaaS</p>
          </div>
        </div>

        {/* Ver Landing Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Página Pública</CardTitle>
          </CardHeader>
          <CardContent>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> Ver Landing Atual
              </Button>
            </a>
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
              <Label htmlFor="video-url">URL do Vídeo</Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou URL do Vimeo/MP4"
              />
              <p className="text-xs text-muted-foreground">
                Suporta links do YouTube, Vimeo ou URL direta de vídeo MP4.
                {videoUrl ? " Este vídeo será exibido na seção 'Como funciona' da landing page." : " Deixe vazio para ocultar a seção de vídeo."}
              </p>
            </div>

            {embedUrl && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
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
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformLandingPage;
