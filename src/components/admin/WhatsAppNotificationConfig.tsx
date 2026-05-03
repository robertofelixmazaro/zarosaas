import { useEffect, useState } from "react";
import { MessageSquare, Save, HelpCircle, ChevronRight, Wifi, Loader2, CheckCircle2, XCircle, Send, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { DEFAULT_APPOINTMENT_TEMPLATE, TEMPLATE_VARIABLES, renderTemplate } from "@/lib/whatsappTemplate";

const DEFAULT_REMINDER_MSG = DEFAULT_APPOINTMENT_TEMPLATE;
const DEFAULT_CONFIRMATION_MSG = DEFAULT_APPOINTMENT_TEMPLATE;

interface WaSettings {
  wa_reminder_enabled: boolean;
  wa_reminder_hours: string;
  wa_confirmation_enabled: boolean;
  wa_reminder_message: string;
  wa_confirmation_message: string;
  wa_appointment_template: string;
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
  wa_appointment_template: DEFAULT_APPOINTMENT_TEMPLATE,
  wa_api_url: "",
  wa_api_key: "",
  wa_instance_id: "",
};

const WhatsAppNotificationConfig = () => {
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState<WaSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testLog, setTestLog] = useState<{ type: "success" | "error"; message: string; detail?: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "checking" | "connected" | "disconnected">("unknown");

  const checkConnectionStatus = async () => {
    if (!settings.wa_api_url || !settings.wa_api_key || !settings.wa_instance_id) return;
    setConnectionStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("test-whatsapp", {
        body: {
          action: "check_connection",
          api_url: settings.wa_api_url,
          api_key: settings.wa_api_key,
          instance_id: settings.wa_instance_id,
        },
      });
      if (error || !data?.success) {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus(data.connected ? "connected" : "disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  };

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
          wa_appointment_template: map.wa_appointment_template || defaults.wa_appointment_template,
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
        wa_appointment_template: settings.wa_appointment_template,
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
      // Auto-check connection after saving
      if (settings.wa_api_url && settings.wa_api_key && settings.wa_instance_id) {
        checkConnectionStatus();
      }
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground text-sm py-4">Carregando...</p>;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Notificações WhatsApp Automáticas</h3>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <HelpCircle className="h-3.5 w-3.5" /> Como configurar?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Tutorial: Configurar WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 text-sm">
              {/* Step 1 */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  Escolher um provedor de API
                </h4>
                <p className="text-muted-foreground pl-8">
                  O sistema utiliza integração com APIs externas como:
                </p>
                <ul className="list-disc pl-12 text-muted-foreground space-y-1">
                  <li><strong>Evolution API</strong></li>
                  <li><strong>Z-API</strong></li>
                  <li>Outros provedores compatíveis</li>
                </ul>
                <p className="text-muted-foreground pl-8">Escolha um provedor e crie uma conta na plataforma.</p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  Criar uma instância de WhatsApp
                </h4>
                <p className="text-muted-foreground pl-8">
                  Dentro do provedor escolhido, crie uma nova instância. Após criar, você receberá:
                </p>
                <ul className="list-disc pl-12 text-muted-foreground space-y-1">
                  <li>URL da API</li>
                  <li>API Key / Token</li>
                  <li>ID da Instância</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                  Conectar o WhatsApp no sistema
                </h4>
                <p className="text-muted-foreground pl-8">No painel, preencha os campos:</p>
                <ul className="list-none pl-8 text-muted-foreground space-y-1">
                  <li><ChevronRight className="inline h-3 w-3" /> <strong>URL da API</strong> → cole a URL fornecida</li>
                  <li><ChevronRight className="inline h-3 w-3" /> <strong>API Key / Token</strong> → cole sua chave</li>
                  <li><ChevronRight className="inline h-3 w-3" /> <strong>ID da Instância</strong> → informe o ID</li>
                </ul>
                <p className="text-muted-foreground pl-8">Depois clique em <strong>Salvar configurações</strong>.</p>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                  Conectar seu celular
                </h4>
                <p className="text-muted-foreground pl-8">
                  Alguns provedores exigem escanear um QR Code. Abra o WhatsApp no celular e conecte o dispositivo.
                </p>
              </div>

              {/* Step 5 */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span>
                  Ativar os envios automáticos
                </h4>
                <p className="text-muted-foreground pl-8">Após conectar, ative:</p>
                <ul className="list-disc pl-12 text-muted-foreground space-y-1">
                  <li>Lembretes automáticos via WhatsApp</li>
                  <li>Confirmação de presença via WhatsApp</li>
                </ul>
              </div>

              {/* Variables */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-sm">Variáveis disponíveis nas mensagens</h4>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <code className="bg-background px-2 py-1 rounded">{"{{cliente}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{empresa}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{servico}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{data}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{hora}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{link_confirmacao}}"}</code>
                  <code className="bg-background px-2 py-1 rounded">{"{{link_cancelamento}}"}</code>
                </div>
              </div>

              {/* Example */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold text-sm">Exemplo de mensagem</h4>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-3 leading-relaxed">
{`Olá {{cliente}} 👋

Este é um lembrete do seu agendamento com {{empresa}}.

Serviço: {{servico}}
Data: {{data}}
Horário: {{hora}}

Confirme sua presença:
{{link_confirmacao}}

Caso precise cancelar:
{{link_cancelamento}}`}
                </pre>
              </div>

              <p className="text-center text-muted-foreground text-xs pt-2">
                ✅ Pronto! Seu WhatsApp estará conectado e enviando notificações automáticas.
              </p>
            </div>
          </DialogContent>
        </Dialog>
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

        {/* Connection Status Banner */}
        {settings.wa_api_url && settings.wa_api_key && settings.wa_instance_id && (
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            connectionStatus === "connected"
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
              : connectionStatus === "disconnected"
              ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
              : "bg-muted/30 border-border"
          }`}>
            <div className="flex items-center gap-2">
              {connectionStatus === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : connectionStatus === "connected" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : connectionStatus === "disconnected" ? (
                <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Wifi className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {connectionStatus === "checking" && "Verificando conexão..."}
                {connectionStatus === "connected" && "WhatsApp conectado ✅"}
                {connectionStatus === "disconnected" && "Instância não conectada ❌"}
                {connectionStatus === "unknown" && "Status da conexão desconhecido"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={connectionStatus === "checking"}
              onClick={checkConnectionStatus}
              className="text-xs"
            >
              {connectionStatus === "checking" ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Wifi className="h-3 w-3 mr-1" />
              )}
              Ver status
            </Button>
          </div>
        )}
        {connectionStatus === "disconnected" && (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              ⚠️ Sua instância do WhatsApp não está conectada.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Acesse o painel da sua API (Z-API, Evolution API, etc.) e escaneie o QR Code para conectar o WhatsApp. 
              Sem essa etapa, as mensagens não serão enviadas.
            </p>
          </div>
        )}


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

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configurações WhatsApp"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={async () => {
                if (!settings.wa_api_url || !settings.wa_api_key || !settings.wa_instance_id) {
                  toast.error("Preencha todas as informações da API antes de testar a conexão.");
                  return;
                }
                setTesting(true);
                setTestResult(null);
                setTestLog(null);
                try {
                  const { data, error } = await supabase.functions.invoke("test-whatsapp", {
                    body: {
                      action: "check_connection",
                      api_url: settings.wa_api_url,
                      api_key: settings.wa_api_key,
                      instance_id: settings.wa_instance_id,
                    },
                  });
                  if (error) {
                    setTestResult("error");
                    setTestLog({ type: "error", message: "Erro ao testar conexão", detail: error.message });
                    toast.error("Erro ao testar conexão");
                  } else if (data?.success) {
                    setTestResult(data.connected ? "success" : "success");
                    setTestLog({
                      type: data.connected ? "success" : "error",
                      message: data.message,
                      detail: `Estado: ${data.state}`,
                    });
                    if (data.connected) {
                      toast.success("Conexão bem-sucedida! WhatsApp conectado.");
                    } else {
                      toast.warning(data.message);
                    }
                  } else {
                    setTestResult("error");
                    setTestLog({
                      type: "error",
                      message: data?.error || "Erro desconhecido",
                      detail: data?.api_response ? `Código: ${data.status_code} — ${data.api_response}` : undefined,
                    });
                    toast.error(data?.error || "Falha na conexão");
                  }
                } catch (err: any) {
                  setTestResult("error");
                  setTestLog({ type: "error", message: "Falha ao conectar", detail: err.message });
                  toast.error("Falha ao conectar");
                }
                setTesting(false);
              }}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : testResult === "success" ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              ) : testResult === "error" ? (
                <XCircle className="h-4 w-4 mr-2 text-destructive" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {testing ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>

          {/* Test Send Section */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              Testar Envio de Mensagem
            </h4>
            <p className="text-xs text-muted-foreground">
              Envie uma mensagem de teste para verificar se a integração está funcionando.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="5516999999999"
                    className="pl-9"
                  />
                </div>
                {testPhone && (() => {
                  const digits = testPhone.replace(/\D/g, "");
                  const withCountry = digits.startsWith("55") ? digits : "55" + digits;
                  if (withCountry.length < 12 || withCountry.length > 13) {
                    return <p className="text-xs text-destructive mt-1">Número inválido. Use: 5516999999999</p>;
                  }
                  return <p className="text-xs text-green-600 mt-1">Número formatado: {withCountry}</p>;
                })()}
              </div>
              <Button
                variant="default"
                size="sm"
                disabled={sendingTest || !testPhone}
                onClick={async () => {
                  if (!settings.wa_api_url || !settings.wa_api_key || !settings.wa_instance_id) {
                    toast.error("Configure a API antes de testar o envio.");
                    return;
                  }
                  setSendingTest(true);
                  setTestLog(null);
                  try {
                    const { data, error } = await supabase.functions.invoke("test-whatsapp", {
                      body: {
                        action: "send_test",
                        api_url: settings.wa_api_url,
                        api_key: settings.wa_api_key,
                        instance_id: settings.wa_instance_id,
                        phone: testPhone,
                      },
                    });
                    if (error) {
                      setTestLog({ type: "error", message: "Erro ao enviar", detail: error.message });
                      toast.error("Erro ao enviar mensagem de teste");
                    } else if (data?.success) {
                      setTestLog({
                        type: "success",
                        message: data.message,
                        detail: data.api_response ? `Resposta: ${data.api_response}` : undefined,
                      });
                      toast.success("Mensagem enviada com sucesso!");
                    } else {
                      setTestLog({
                        type: "error",
                        message: data?.error || "Erro ao enviar",
                        detail: data?.api_response ? `Código: ${data.status_code} — ${data.api_response}` : undefined,
                      });
                      toast.error(data?.error || "Falha no envio");
                    }
                  } catch (err: any) {
                    setTestLog({ type: "error", message: "Falha ao enviar", detail: err.message });
                    toast.error("Falha ao enviar");
                  }
                  setSendingTest(false);
                }}
              >
                {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {sendingTest ? "Enviando..." : "Enviar Teste"}
              </Button>
            </div>
          </div>

          {/* Log de resultado */}
          {testLog && (
            <div className={`p-3 rounded-lg border text-sm ${
              testLog.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200"
            }`}>
              <div className="flex items-start gap-2">
                {testLog.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{testLog.message}</p>
                  {testLog.detail && (
                    <p className="text-xs mt-1 opacity-80 break-all">{testLog.detail}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNotificationConfig;
