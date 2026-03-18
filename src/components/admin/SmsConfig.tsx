import { useEffect, useState } from "react";
import { Smartphone, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const SECRET_KEYS = ["twilio_sid", "twilio_token", "twilio_phone"] as const;
const SETTING_KEY = "sms_ativo";

const SmsConfig = () => {
  const { tenantId } = useTenant();
  const [smsAtivo, setSmsAtivo] = useState(false);
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    setLoading(true);

    // Load sms_ativo from site_settings
    const { data: settingData } = await supabase
      .from("site_settings" as any)
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", SETTING_KEY)
      .maybeSingle();

    if (settingData) {
      setSmsAtivo((settingData as any).value === "true");
    }

    // Load secrets (masked) from tenant_secrets
    const { data: secrets } = await supabase
      .from("tenant_secrets" as any)
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", [...SECRET_KEYS]);

    if (secrets) {
      (secrets as any[]).forEach((s) => {
        if (s.key === "twilio_sid") setTwilioSid(s.value);
        if (s.key === "twilio_token") setTwilioToken(s.value);
        if (s.key === "twilio_phone") setTwilioPhone(s.value);
      });
    }

    setLoading(false);
  };

  const upsertSecret = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("tenant_secrets" as any)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("tenant_secrets" as any)
        .update({ value } as any)
        .eq("id", (existing as any).id);
    } else {
      await supabase
        .from("tenant_secrets" as any)
        .insert({ tenant_id: tenantId, key, value } as any);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("site_settings" as any)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings" as any)
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id);
    } else {
      await supabase
        .from("site_settings" as any)
        .insert({ tenant_id: tenantId, key, value } as any);
    }
  };

  const handleSave = async () => {
    if (smsAtivo && (!twilioSid || !twilioToken || !twilioPhone)) {
      toast.error("Preencha todas as credenciais do Twilio para ativar o SMS.");
      return;
    }

    setSaving(true);
    try {
      await upsertSetting(SETTING_KEY, String(smsAtivo));
      await upsertSecret("twilio_sid", twilioSid);
      await upsertSecret("twilio_token", twilioToken);
      await upsertSecret("twilio_phone", twilioPhone);
      toast.success("Configuração de SMS salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar configuração", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5 flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Smartphone className="h-5 w-5" />
        <h3 className="font-semibold">Configuração de SMS (Twilio)</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Configure suas credenciais do Twilio para enviar SMS automáticos aos clientes quando um agendamento for criado.
      </p>

      <div className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">SMS Ativo</Label>
            <p className="text-xs text-muted-foreground">Ativar envio automático de SMS</p>
          </div>
          <Switch checked={smsAtivo} onCheckedChange={setSmsAtivo} />
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Account SID</Label>
            <Input
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Auth Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="Seu Auth Token"
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Número do Twilio (From)</Label>
            <Input
              placeholder="+5511999999999"
              value={twilioPhone}
              onChange={(e) => setTwilioPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Como obter as credenciais:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Acesse <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">console.twilio.com</a></li>
            <li>Copie o <strong>Account SID</strong> e <strong>Auth Token</strong> na página inicial</li>
            <li>Em <strong>Phone Numbers</strong>, copie seu número Twilio</li>
          </ol>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar Configuração SMS"}
        </Button>
      </div>
    </div>
  );
};

export default SmsConfig;
