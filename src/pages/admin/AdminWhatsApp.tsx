import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, PlugZap, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StatusCode =
  | "connected"
  | "connecting"
  | "disconnected"
  | "auth_error"
  | "instance_not_found"
  | "api_unavailable";

const STATUS_UI: Record<StatusCode, { dot: string; label: string; className: string }> = {
  connected: { dot: "🟢", label: "WhatsApp conectado", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  connecting: { dot: "🟡", label: "Conectando", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  disconnected: { dot: "🔴", label: "WhatsApp desconectado", className: "bg-destructive/10 text-destructive border-destructive/30" },
  auth_error: { dot: "⚠️", label: "Erro de autenticação", className: "bg-destructive/10 text-destructive border-destructive/30" },
  instance_not_found: { dot: "⚠️", label: "Instância não encontrada", className: "bg-destructive/10 text-destructive border-destructive/30" },
  api_unavailable: { dot: "⚠️", label: "API indisponível", className: "bg-muted text-muted-foreground border-border" },
};

const AdminWhatsApp = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [status, setStatus] = useState<StatusCode | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-evolution", { body: payload });
    if (error) {
      let message = "Falha ao comunicar com o servidor.";
      try {
        const ctx = (error as any).context;
        if (ctx?.json) message = (await ctx.json())?.error || message;
        else if (ctx?.text) message = JSON.parse(await ctx.text())?.error || message;
      } catch { /* keep default message */ }
      throw new Error(message);
    }
    return data as any;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await call({ action: "get" });
        setApiUrl(data.api_url || "");
        setInstanceName(data.instance_name || "");
        setHasApiKey(!!data.has_api_key);
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
        api_url: apiUrl,
        api_key: apiKey,
        instance_name: instanceName,
      });
      setApiUrl(data.api_url);
      setInstanceName(data.instance_name);
      setHasApiKey(true);
      setApiKey("");
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
          <p className="text-sm text-muted-foreground">Integração da sua empresa com a Evolution API.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração da Evolution API</CardTitle>
          <CardDescription>
            Os dados abaixo são usados somente pela sua empresa. A API Key fica armazenada no servidor e nunca é
            exibida novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-url">URL Base</Label>
            <Input
              id="wa-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://sua-evolution-api.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-key">API Key</Label>
            <Input
              id="wa-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? "•••••••• (salva — preencha para substituir)" : "Sua API Key da Evolution API"}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-instance">Nome da Instância</Label>
            <Input
              id="wa-instance"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="nome-da-sua-instancia"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar configuração
            </Button>
            <Button variant="outline" onClick={handleVerify} disabled={verifying || !hasApiKey} className="gap-2">
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
    </div>
  );
};

export default AdminWhatsApp;
