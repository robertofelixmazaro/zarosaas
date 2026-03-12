import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, ShieldAlert, Mail, Send } from "lucide-react";
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

const NO_SHOW_KEYS = [
  "no_show_global_enabled",
  "no_show_default_deposit",
  "no_show_default_retention",
  "no_show_default_cancel_hours",
  "no_show_max_retention",
  "no_show_max_deposit",
];

const NO_SHOW_LABELS: Record<string, string> = {
  no_show_global_enabled: "Habilitar no-show globalmente",
  no_show_default_deposit: "Valor de garantia padrão (R$)",
  no_show_default_retention: "Percentual de retenção padrão (%)",
  no_show_default_cancel_hours: "Prazo cancelamento padrão (horas)",
  no_show_max_retention: "Percentual máximo de retenção (%)",
  no_show_max_deposit: "Valor máximo de garantia (R$)",
};

const PlatformSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNoShow, setSavingNoShow] = useState(false);

  // No-show state
  const [noShowSettings, setNoShowSettings] = useState<Record<string, string>>({
    no_show_global_enabled: "false",
    no_show_default_deposit: "0",
    no_show_default_retention: "100",
    no_show_default_cancel_hours: "4",
    no_show_max_retention: "100",
    no_show_max_deposit: "500",
  });

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings" as any)
      .select("*")
      .order("key");
    if (error) { toast.error("Erro ao carregar configurações"); return; }
    const all = (data as any) || [];
    const regular = all.filter((s: Setting) => !NO_SHOW_KEYS.includes(s.key));
    setSettings(regular);

    // Load no-show settings
    const nsMap: Record<string, string> = { ...noShowSettings };
    all.forEach((s: Setting) => {
      if (NO_SHOW_KEYS.includes(s.key)) nsMap[s.key] = s.value;
    });
    setNoShowSettings(nsMap);
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

  const handleSaveNoShow = async () => {
    setSavingNoShow(true);
    try {
      for (const [key, value] of Object.entries(noShowSettings)) {
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
      toast.success("Política de no-show salva!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSavingNoShow(false);
  };

  const noShowEnabled = noShowSettings.no_show_global_enabled === "true";

  return (
    <div className="min-h-screen bg-background">
      <PlatformHeader>
        <Link to="/superadmin/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
      </PlatformHeader>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
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

        {/* No-Show Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Política de No-Show (Global)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure as regras padrão de garantia de agendamento para toda a plataforma. Esses valores servirão como padrão para novas empresas.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={noShowEnabled}
                  onCheckedChange={(v) => setNoShowSettings(prev => ({ ...prev, no_show_global_enabled: String(v) }))}
                />
                <span className="text-sm font-medium">Habilitar recurso de no-show na plataforma</span>
              </div>

              {noShowEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{NO_SHOW_LABELS.no_show_default_deposit}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={noShowSettings.no_show_default_deposit}
                        onChange={e => setNoShowSettings(prev => ({ ...prev, no_show_default_deposit: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{NO_SHOW_LABELS.no_show_default_retention}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={noShowSettings.no_show_default_retention}
                        onChange={e => setNoShowSettings(prev => ({ ...prev, no_show_default_retention: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{NO_SHOW_LABELS.no_show_default_cancel_hours}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={noShowSettings.no_show_default_cancel_hours}
                        onChange={e => setNoShowSettings(prev => ({ ...prev, no_show_default_cancel_hours: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Limites máximos (aplicados a todos os tenants)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{NO_SHOW_LABELS.no_show_max_retention}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={noShowSettings.no_show_max_retention}
                          onChange={e => setNoShowSettings(prev => ({ ...prev, no_show_max_retention: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>{NO_SHOW_LABELS.no_show_max_deposit}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={noShowSettings.no_show_max_deposit}
                          onChange={e => setNoShowSettings(prev => ({ ...prev, no_show_max_deposit: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button onClick={handleSaveNoShow} disabled={savingNoShow} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {savingNoShow ? "Salvando..." : "Salvar Política de No-Show"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Test Email */}
        <TestEmailCard />
      </main>
    </div>
  );
};

const TestEmailCard = () => {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Informe um email válido");
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada"); return; }

      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to: testEmail },
      });

      if (error) throw error;
      toast.success(data?.message || "Email de teste enviado!");
    } catch (err: any) {
      toast.error("Erro ao enviar email de teste", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Teste de Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Envie um email de teste para verificar se o sistema de envio está funcionando corretamente com o domínio <strong>zarosistemas.com.br</strong>.
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Digite o email de destino"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
          />
          <Button onClick={handleSendTestEmail} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : "Enviar Teste"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformSettings;
