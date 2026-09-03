import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, Send, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ChannelSettings {
  reminder_email_enabled: boolean;
  reminder_push_enabled: boolean;
  reminder_sms_enabled: boolean;
}

const defaultChannels: ChannelSettings = {
  reminder_email_enabled: true,
  reminder_push_enabled: true,
  reminder_sms_enabled: false,
};

const channelKeys = Object.keys(defaultChannels) as (keyof ChannelSettings)[];

const channels = [
  { key: "reminder_email_enabled" as const, label: "E-mail", desc: "Envia lembrete por e-mail ao cliente", icon: Mail },
  { key: "reminder_push_enabled" as const, label: "Notificação Push", desc: "Notificação push para o administrador/equipe", icon: Bell },
  { key: "reminder_sms_enabled" as const, label: "SMS", desc: "Envia lembrete por SMS ao cliente (requer integração)", icon: Smartphone },
];

const ReminderChannelConfig = () => {
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState<ChannelSettings>(defaultChannels);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const allEnabled = channelKeys.every((k) => settings[k]);
  const allDisabled = channelKeys.every((k) => !settings[k]);

  useEffect(() => {
    if (!tenantId) return;
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", channelKeys);

    if (data) {
      const map: Partial<ChannelSettings> = {};
      (data as any[]).forEach((r) => {
        (map as any)[r.key] = r.value === "true";
      });
      setSettings({ ...defaultChannels, ...map });
    }
    setLoading(false);
  };

  const toggleAllNotifications = (status: boolean) => {
    const updated: ChannelSettings = {
      reminder_email_enabled: status,
          reminder_push_enabled: status,
      reminder_sms_enabled: status,
    };
    setSettings(updated);
  };

  const handleToggleSingle = (key: keyof ChannelSettings, checked: boolean) => {
    // When any channel changes, all follow the same state
    toggleAllNotifications(checked);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existing } = await supabase
          .from("site_settings" as any)
          .select("id")
          .eq("key", key)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existing) {
          await supabase.from("site_settings" as any).update({ value: String(value), updated_at: new Date().toISOString() } as any).eq("id", (existing as any).id);
        } else {
          await supabase.from("site_settings" as any).insert({ key, value: String(value), tenant_id: tenantId } as any);
        }
      }
      toast.success("Canais de lembrete salvos!");
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          <h3 className="font-semibold">Canais de Lembrete</h3>
        </div>
        <Button
          variant={allEnabled ? "destructive" : "default"}
          size="sm"
          className="gap-2"
          onClick={() => toggleAllNotifications(!allEnabled)}
        >
          <Power className="h-4 w-4" />
          {allEnabled ? "Desativar Todos" : "Ativar Todos"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Ative ou desative todos os canais de lembrete de uma só vez. Todos os canais são sincronizados automaticamente.
      </p>
      <div className="space-y-4">
        {channels.map((ch) => {
          const Icon = ch.icon;
          return (
            <div key={ch.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{ch.label}</p>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </div>
              </div>
              <Switch
                checked={settings[ch.key]}
                onCheckedChange={(checked) => handleToggleSingle(ch.key, checked)}
              />
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="mt-4" disabled={saving} onClick={handleSave}>
        {saving ? "Salvando..." : "Salvar Canais"}
      </Button>
    </div>
  );
};

export default ReminderChannelConfig;
