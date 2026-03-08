import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, PlayCircle, BookOpen, Eye } from "lucide-react";
import { toast } from "sonner";

const HELP_KEYS = [
  "help_video_url",
  "help_tour_enabled",
  "help_support_whatsapp",
];

const PlatformHelpCenter = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [tourEnabled, setTourEnabled] = useState(true);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", HELP_KEYS)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((r) => (map[r.key] = r.value));
        setVideoUrl(map.help_video_url || "");
        setTourEnabled(map.help_tour_enabled !== "false");
        setSupportWhatsapp(map.help_support_whatsapp || "");
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: "help_video_url", value: videoUrl },
        { key: "help_tour_enabled", value: tourEnabled ? "true" : "false" },
        { key: "help_support_whatsapp", value: supportWhatsapp },
      ];

      for (const s of settings) {
        const { data: existing } = await supabase
          .from("platform_settings")
          .select("id")
          .eq("key", s.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("platform_settings")
            .update({ value: s.value, updated_at: new Date().toISOString() })
            .eq("key", s.key);
        } else {
          await supabase
            .from("platform_settings")
            .insert({ key: s.key, value: s.value });
        }
      }

      toast.success("Configurações da Central de Ajuda salvas!");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Central de Ajuda</h2>
        <p className="text-muted-foreground">Configure o vídeo explicativo, tour guiado e suporte.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Vídeo Explicativo
          </CardTitle>
          <CardDescription>URL do vídeo que aparece na Central de Ajuda dos clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Vídeo</Label>
            <Input
              placeholder="https://youtube.com/watch?v=... ou URL do Vimeo/MP4"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Aceita YouTube, Vimeo e MP4.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Tour Guiado
          </CardTitle>
          <CardDescription>O tour interativo aparece no primeiro acesso de novos clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tour guiado ativo</p>
              <p className="text-xs text-muted-foreground">Quando ativo, novos usuários verão o tour automaticamente.</p>
            </div>
            <Switch checked={tourEnabled} onCheckedChange={setTourEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Suporte
          </CardTitle>
          <CardDescription>Número do WhatsApp para o botão de suporte na Central de Ajuda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>WhatsApp de Suporte</Label>
            <Input
              placeholder="5511999999999"
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número (sem espaços).</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default PlatformHelpCenter;
