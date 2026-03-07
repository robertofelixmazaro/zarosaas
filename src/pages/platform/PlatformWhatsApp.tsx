import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, MessageSquare } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

const WA_KEYS = [
  "whatsapp_global_enabled",
  "whatsapp_api_type",
  "whatsapp_daily_limit",
];

const WA_LABELS: Record<string, string> = {
  whatsapp_global_enabled: "Habilitar WhatsApp globalmente",
  whatsapp_api_type: "Tipo de API WhatsApp",
  whatsapp_daily_limit: "Limite de mensagens por dia",
};

const PlatformWhatsApp = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_global_enabled: "false",
    whatsapp_api_type: "external_api",
    whatsapp_daily_limit: "500",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings" as any)
      .select("*")
      .in("key", WA_KEYS);
    if (error) {
      toast.error("Erro ao carregar configurações");
      return;
    }
    const map: Record<string, string> = { ...settings };
    (data as any[] || []).forEach((s: any) => {
      if (WA_KEYS.includes(s.key)) map[s.key] = s.value;
    });
    setSettings(map);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existing } = await supabase
          .from("platform_settings" as any)
          .select("id")
          .eq("key", key)
          .maybeSingle();
        if (existing) {
          await supabase.from("platform_settings" as any)
            .update({ value, updated_at: new Date().toISOString() } as any)
            .eq("id", (existing as any).id);
        } else {
          await supabase.from("platform_settings" as any)
            .insert({ key, value } as any);
        }
      }
      toast.success("Configurações de WhatsApp salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  const enabled = settings.whatsapp_global_enabled === "true";

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/configuracoes">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Configurações WhatsApp (Global)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Configure as regras globais de envio de mensagens WhatsApp para toda a plataforma.
                </p>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setSettings(prev => ({ ...prev, whatsapp_global_enabled: String(v) }))}
                  />
                  <span className="text-sm font-medium">Habilitar envio de WhatsApp na plataforma</span>
                </div>

                {enabled && (
                  <>
                    <div>
                      <Label>{WA_LABELS.whatsapp_api_type}</Label>
                      <Input
                        value={settings.whatsapp_api_type}
                        onChange={e => setSettings(prev => ({ ...prev, whatsapp_api_type: e.target.value }))}
                        placeholder="external_api"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Tipo de integração: external_api (Evolution API, Z-API, etc.)</p>
                    </div>

                    <div>
                      <Label>{WA_LABELS.whatsapp_daily_limit}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings.whatsapp_daily_limit}
                        onChange={e => setSettings(prev => ({ ...prev, whatsapp_daily_limit: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Limite máximo de mensagens por dia por tenant</p>
                    </div>
                  </>
                )}

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Configurações WhatsApp"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PlatformWhatsApp;
