import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import PlatformHeader from "@/components/PlatformHeader";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string;
}

const SETTING_LABELS: Record<string, string> = {
  platform_name: "Nome da Plataforma",
  support_email: "Email de Suporte",
  terms_url: "URL dos Termos de Uso",
  privacy_url: "URL da Política de Privacidade",
  default_plan_id: "ID do Plano Padrão",
};

const PlatformSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings" as any)
      .select("*")
      .order("key");
    if (error) { toast.error("Erro ao carregar configurações"); return; }
    setSettings((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      await supabase
        .from("platform_settings" as any)
        .update({ value: s.value, updated_at: new Date().toISOString() } as any)
        .eq("id", s.id);
    }
    setSaving(false);
    toast.success("Configurações salvas");
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/admin-platform">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-4">
                {settings.map(s => (
                  <div key={s.key}>
                    <Label>{SETTING_LABELS[s.key] || s.key}</Label>
                    <Input
                      value={s.value}
                      onChange={e => updateValue(s.key, e.target.value)}
                      placeholder={SETTING_LABELS[s.key] || s.key}
                    />
                  </div>
                ))}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PlatformSettings;
