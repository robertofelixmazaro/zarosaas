import { useEffect, useState } from "react";
import { MessageSquare, Save, HelpCircle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const DEFAULT_REMINDER_MSG =
  "Olá {{cliente}} 👋\n\nLembrando do seu horário às {{hora}} na {{empresa}}.\n\n📅 Data: {{data}}\n✂️ Serviço: {{servico}}\n\nTe esperamos! 😄";

const DEFAULT_CONFIRMATION_MSG =
  "Olá {{cliente}} 👋\n\nSeu horário está marcado para {{data}} às {{hora}} na {{empresa}}.\n\n✅ Confirmar presença:\n{{link_confirmacao}}\n\n❌ Cancelar agendamento:\n{{link_cancelamento}}";

interface WaSettings {
  wa_reminder_enabled: boolean;
  wa_reminder_hours: string;
  wa_confirmation_enabled: boolean;
  wa_reminder_message: string;
  wa_confirmation_message: string;
  wa_api_url: string;
  wa_api_key: string;
  wa_instance_id: string;
}

const defaults: WaSettings = {
  wa_reminder_enabled: false,
  wa_reminder_hours: "2",
  wa_confirmation_enabled: false,
  wa_reminder_message: DEFAULT_REMINDER_MSG,
  wa_confirmation_message: DEFAULT_CONFIRMATION_MSG,
  wa_api_url: "",
  wa_api_key: "",
  wa_instance_id: "",
};

const WhatsAppNotificationConfig = () => {
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState<WaSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", Object.keys(defaults));
      if (data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((r: any) => { map[r.key] = r.value; });
        setSettings({
          wa_reminder_enabled: map.wa_reminder_enabled === "true",
          wa_reminder_hours: map.wa_reminder_hours || defaults.wa_reminder_hours,
          wa_confirmation_enabled: map.wa_confirmation_enabled === "true",
          wa_reminder_message: map.wa_reminder_message || defaults.wa_reminder_message,
          wa_confirmation_message: map.wa_confirmation_message || defaults.wa_confirmation_message,
          wa_api_url: map.wa_api_url || "",
          wa_api_key: map.wa_api_key || "",
          wa_instance_id: map.wa_instance_id || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: Record<string, string> = {
        wa_reminder_enabled: String(settings.wa_reminder_enabled),
        wa_reminder_hours: settings.wa_reminder_hours,
        wa_confirmation_enabled: String(settings.wa_confirmation_enabled),
        wa_reminder_message: settings.wa_reminder_message,
        wa_confirmation_message: settings.wa_confirmation_message,
        wa_api_url: settings.wa_api_url,
        wa_api_key: settings.wa_api_key,
        wa_instance_id: settings.wa_instance_id,
      };
      for (const [key, value] of Object.entries(entries)) {
        const { data: existing } = await supabase
          .from("site_settings" as any)
          .select("id")
          .eq("key", key)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (existing) {
          await supabase.from("site_settings" as any)
            .update({ value, updated_at: new Date().toISOString() } as any)
            .eq("id", (existing as any).id);
        } else {
          await supabase.from("site_settings" as any)
            .insert({ key, value, tenant_id: tenantId } as any);
        }
      }
      toast.success("Configurações de WhatsApp salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground text-sm py-4">Carregando...</p>;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Notificações WhatsApp Automáticas</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Configure o envio automático de lembretes e confirmações via WhatsApp usando API externa (Evolution API, Z-API, etc.)
      </p>

      <div className="space-y-5">
        {/* API Config */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <h4 className="text-sm font-medium">Configuração da API WhatsApp</h4>
          <div>
            <label className="text-sm font-medium mb-1 block">URL da API</label>
            <Input
              value={settings.wa_api_url}
              onChange={e => setSettings({ ...settings, wa_api_url: e.target.value })}
              placeholder="https://api.evolution-api.com ou https://api.z-api.io"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">API Key / Token</label>
            <Input
              type="password"
              value={settings.wa_api_key}
              onChange={e => setSettings({ ...settings, wa_api_key: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ID da Instância</label>
            <Input
              value={settings.wa_instance_id}
              onChange={e => setSettings({ ...settings, wa_instance_id: e.target.value })}
              placeholder="ID da instância do WhatsApp"
            />
          </div>
        </div>

        {/* Reminder */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.wa_reminder_enabled}
              onCheckedChange={v => setSettings({ ...settings, wa_reminder_enabled: v })}
            />
            <span className="text-sm font-medium">Ativar lembrete automático via WhatsApp</span>
          </div>
          {settings.wa_reminder_enabled && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Tempo antes do agendamento (horas)</label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={settings.wa_reminder_hours}
                  onChange={e => setSettings({ ...settings, wa_reminder_hours: e.target.value })}
                  className="max-w-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem de lembrete</label>
                <textarea
                  value={settings.wa_reminder_message}
                  onChange={e => setSettings({ ...settings, wa_reminder_message: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                />
              </div>
            </>
          )}
        </div>

        {/* Confirmation */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.wa_confirmation_enabled}
              onCheckedChange={v => setSettings({ ...settings, wa_confirmation_enabled: v })}
            />
            <span className="text-sm font-medium">Ativar confirmação de presença via WhatsApp</span>
          </div>
          {settings.wa_confirmation_enabled && (
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem de confirmação</label>
              <textarea
                value={settings.wa_confirmation_message}
                onChange={e => setSettings({ ...settings, wa_confirmation_message: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
              />
            </div>
          )}
        </div>

        {/* Variables help */}
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {["{{cliente}}", "{{empresa}}", "{{servico}}", "{{data}}", "{{hora}}", "{{link_confirmacao}}", "{{link_cancelamento}}"].map(v => (
              <code key={v} className="text-xs bg-muted px-2 py-1 rounded font-mono">{v}</code>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações WhatsApp"}
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppNotificationConfig;
