import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoSettings {
  timezone?: string;
  confirm_client_enabled: boolean;
  confirm_client_template: string;
  confirm_owner_enabled: boolean;
  confirm_owner_template: string;
  owner_phone: string | null;
  reminder_1d_enabled: boolean;
  reminder_1d_time: string;
  reminder_1d_template: string;
  reminder_2h_enabled: boolean;
  reminder_2h_template: string;
}

const VARIABLES: [string, string][] = [
  ["{cliente}", "Nome do cliente"],
  ["{servico}", "Serviço agendado"],
  ["{data}", "Data do agendamento"],
  ["{horario}", "Horário"],
  ["{empresa}", "Nome da empresa"],
  ["{profissional}", "Profissional responsável"],
  ["{telefone}", "Telefone do cliente"],
  ["{endereco}", "Endereço da empresa"],
];

const PREVIEW_VALUES: Record<string, string> = {
  cliente: "João Silva",
  servico: "Corte de cabelo",
  data: "15/09/2026",
  horario: "15:00",
  empresa: "Sua Empresa",
  profissional: "Carlos",
  telefone: "(11) 99999-9999",
  endereco: "Rua Exemplo, 123",
};

function renderPreview(template: string): string {
  let out = template || "";
  for (const [k, v] of Object.entries(PREVIEW_VALUES)) {
    out = out.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, "g"), v);
  }
  return out.trim() || "—";
}

const Preview = ({ text }: { text: string }) => (
  <div className="rounded-md border bg-muted/40 p-3">
    <p className="text-xs font-medium text-muted-foreground mb-1">Prévia</p>
    <p className="text-sm whitespace-pre-wrap">{renderPreview(text)}</p>
  </div>
);

const WhatsAppAutoMessages = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<AutoSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const set = <K extends keyof AutoSettings>(key: K, value: AutoSettings[K]) =>
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-go", { body: payload });
    if (error) {
      let message = "Falha ao comunicar com o servidor.";
      try {
        const ctx = (error as any).context;
        if (ctx?.json) {
          const b = await ctx.json();
          message = b?.error || message;
        }
      } catch { /* keep default */ }
      throw new Error(message);
    }
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await call({ action: "get_auto" });
      if (!data?.settings) throw new Error("Não foi possível carregar as mensagens automáticas.");
      setS(data.settings);
    } catch (e: any) {
      setLoadError(e?.message || "Não foi possível carregar as mensagens automáticas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const data = await call({ action: "save_auto", settings: s });
      setS(data.settings);
      toast.success("Mensagens automáticas salvas.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const variablesCard = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {VARIABLES.map(([v, desc]) => (
          <Badge key={v} variant="outline" className="font-normal">
            <span className="font-mono mr-1">{v}</span>
            <span className="text-muted-foreground">— {desc}</span>
          </Badge>
        ))}
      </div>
    ),
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!s) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Mensagens Automáticas</CardTitle>
          <CardDescription>
            {loadError || "Não foi possível carregar as mensagens automáticas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={load} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pt-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Mensagens Automáticas</h3>
          <p className="text-sm text-muted-foreground">
            Enviadas pela sua própria conexão Evolution Go, sem depender do painel aberto.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variáveis disponíveis</CardTitle>
          <CardDescription>Serão substituídas pelos dados reais do agendamento no envio.</CardDescription>
        </CardHeader>
        <CardContent>{variablesCard}</CardContent>
      </Card>

      {/* CARD 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmação de novo agendamento</CardTitle>
          <CardDescription>Enviada imediatamente após o agendamento ser criado com sucesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto-client">Ativar mensagem para o cliente</Label>
            <Switch
              id="auto-client"
              checked={s.confirm_client_enabled}
              onCheckedChange={(v) => set("confirm_client_enabled", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-client-msg">Mensagem para o cliente</Label>
            <Textarea
              id="auto-client-msg"
              rows={7}
              value={s.confirm_client_template}
              onChange={(e) => set("confirm_client_template", e.target.value)}
              disabled={!s.confirm_client_enabled}
            />
            <Preview text={s.confirm_client_template} />
          </div>

          <div className="border-t pt-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="auto-owner">Ativar aviso para o proprietário</Label>
              <Switch
                id="auto-owner"
                checked={s.confirm_owner_enabled}
                onCheckedChange={(v) => set("confirm_owner_enabled", v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-owner-phone">WhatsApp do proprietário</Label>
              <Input
                id="auto-owner-phone"
                value={s.owner_phone ?? ""}
                onChange={(e) => set("owner_phone", e.target.value)}
                placeholder="5511999999999"
                inputMode="numeric"
                disabled={!s.confirm_owner_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Se ficar vazio, será usado o telefone cadastrado na sua empresa.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-owner-msg">Mensagem para o proprietário</Label>
              <Textarea
                id="auto-owner-msg"
                rows={7}
                value={s.confirm_owner_template}
                onChange={(e) => set("confirm_owner_template", e.target.value)}
                disabled={!s.confirm_owner_enabled}
              />
              <Preview text={s.confirm_owner_template} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lembrete — 1 dia antes</CardTitle>
          <CardDescription>Enviado no dia anterior, no horário escolhido pela sua empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto-1d">Ativar lembrete de 1 dia antes</Label>
            <Switch
              id="auto-1d"
              checked={s.reminder_1d_enabled}
              onCheckedChange={(v) => set("reminder_1d_enabled", v)}
            />
          </div>
          <div className="space-y-2 max-w-[180px]">
            <Label htmlFor="auto-1d-time">Horário do envio</Label>
            <Input
              id="auto-1d-time"
              type="time"
              value={(s.reminder_1d_time || "09:00").slice(0, 5)}
              onChange={(e) => set("reminder_1d_time", e.target.value)}
              disabled={!s.reminder_1d_enabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-1d-msg">Mensagem</Label>
            <Textarea
              id="auto-1d-msg"
              rows={7}
              value={s.reminder_1d_template}
              onChange={(e) => set("reminder_1d_template", e.target.value)}
              disabled={!s.reminder_1d_enabled}
            />
            <Preview text={s.reminder_1d_template} />
          </div>
        </CardContent>
      </Card>

      {/* CARD 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lembrete — 2 horas antes</CardTitle>
          <CardDescription>Enviado ao cliente duas horas antes do horário agendado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto-2h">Ativar lembrete de 2 horas antes</Label>
            <Switch
              id="auto-2h"
              checked={s.reminder_2h_enabled}
              onCheckedChange={(v) => set("reminder_2h_enabled", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-2h-msg">Mensagem</Label>
            <Textarea
              id="auto-2h-msg"
              rows={6}
              value={s.reminder_2h_template}
              onChange={(e) => set("reminder_2h_template", e.target.value)}
              disabled={!s.reminder_2h_enabled}
            />
            <Preview text={s.reminder_2h_template} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar configurações
      </Button>
    </div>
  );
};

export default WhatsAppAutoMessages;
