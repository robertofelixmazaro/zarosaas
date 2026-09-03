import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, PlugZap, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WhatsAppAutoMessages from "@/components/admin/WhatsAppAutoMessages";

type StatusCode =
  | "connected"
  | "disconnected"
  | "logged_out"
  | "auth_error"
  | "not_found"
  | "api_unavailable";

const STATUS_UI: Record<StatusCode, { dot: string; label: string; className: string }> = {
  connected: { dot: "🟢", label: "Conectado", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  logged_out: { dot: "🟡", label: "Aguardando login do WhatsApp", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  disconnected: { dot: "🔴", label: "Desconectado", className: "bg-destructive/10 text-destructive border-destructive/30" },
  auth_error: { dot: "⚠️", label: "Erro de autenticação", className: "bg-destructive/10 text-destructive border-destructive/30" },
  not_found: { dot: "⚠️", label: "Instância não encontrada", className: "bg-destructive/10 text-destructive border-destructive/30" },
  api_unavailable: { dot: "⚠️", label: "API indisponível", className: "bg-muted text-muted-foreground border-border" },
};

const AdminWhatsApp = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  const [baseUrl, setBaseUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [hasToken, setHasToken] = useState(false);

  const [status, setStatus] = useState<StatusCode | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de integração Evolution Go.");

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-go", { body: payload });
    if (error) {
      let message = "Falha ao comunicar com o servidor.";
      try {
        const ctx = (error as any).context;
        if (ctx?.json) {
          const body = await ctx.json();
          message = body?.error || body?.message || message;
        } else if (ctx?.text) {
          const body = JSON.parse(await ctx.text());
          message = body?.error || body?.message || message;
        }
      } catch { /* keep default message */ }
      throw new Error(message);
    }
    return data as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await call({ action: "get" });
        setBaseUrl(data.base_url || "");
        setInstanceName(data.instance_name || "");
        setHasToken(!!data.has_token);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await call({
        action: "save",
        base_url: baseUrl,
        instance_token: instanceToken,
        instance_name: instanceName,
      });
      setBaseUrl(data.base_url);
      setInstanceName(data.instance_name || "");
      setHasToken(true);
      setInstanceToken("");
      setStatus(null);
      setStatusMessage(null);
      toast.success("Configuração salva.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setStatus(null);
    setStatusMessage(null);
    try {
      const data = await call({ action: "verify" });
      setStatus(data.status as StatusCode);
      setStatusMessage(data.message || null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      const data = await call({ action: "send", number: testNumber, text: testMessage });
      if (data?.sent) toast.success(data.message || "Mensagem enviada.");
      else toast.error(data?.message || "Não foi possível enviar a mensagem.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ui = status ? STATUS_UI[status] : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">WhatsApp</h2>
          <p className="text-sm text-muted-foreground">Integração da sua empresa com a What's Evolution Go.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexão com Evolution Go</CardTitle>
          <CardDescription>
            Estes dados pertencem somente à sua empresa. O token fica armazenado no servidor e nunca é exibido
            novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-url">URL Base da Evolution Go</Label>
            <Input
              id="wa-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://sua-evolution-go.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-token">Token da Instância</Label>
            <Input
              id="wa-token"
              type="password"
              value={instanceToken}
              onChange={(e) => setInstanceToken(e.target.value)}
              placeholder={hasToken ? "•••••••• (salvo — preencha para substituir)" : "Token da sua instância"}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-instance">Nome da Instância</Label>
            <Input
              id="wa-instance"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="apenas identificação (opcional)"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Usado apenas para identificação no painel. O envio é autorizado pelo token da instância.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar configuração
            </Button>
            <Button variant="outline" onClick={handleVerify} disabled={verifying || !hasToken} className="gap-2">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Verificar conexão
            </Button>
          </div>

          <div className="pt-2 border-t space-y-2">
            <p className="text-sm font-medium">Status</p>
            {ui ? (
              <>
                <Badge variant="outline" className={`text-sm px-3 py-1 ${ui.className}`}>
                  {ui.dot} {ui.label}
                </Badge>
                {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Clique em "Verificar conexão" para consultar o estado real da instância.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testar envio</CardTitle>
          <CardDescription>
            Usa exatamente a mesma função de envio que será utilizada pelos lembretes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-number">Número de destino</Label>
            <Input
              id="wa-number"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="5511999999999"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Somente dígitos com DDI, sem espaços ou símbolos.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-message">Mensagem</Label>
            <Textarea
              id="wa-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSendTest} disabled={sending || !hasToken} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar teste
          </Button>
        </CardContent>
      </Card>

      <WhatsAppAutoMessages />
    </div>
  );
};

export default AdminWhatsApp;
