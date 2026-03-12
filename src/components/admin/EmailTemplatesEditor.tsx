import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Save, RotateCcw } from "lucide-react";

interface Template {
  type: string;
  subject: string;
  body: string;
}

const TEMPLATE_TYPES = [
  { type: "confirmacao_agendamento", label: "Confirmação de Agendamento" },
  { type: "lembrete_24h", label: "Lembrete 24h antes" },
  { type: "lembrete_2h", label: "Lembrete 2h antes" },
];

const DEFAULT_TEMPLATES: Record<string, Template> = {
  confirmacao_agendamento: {
    type: "confirmacao_agendamento",
    subject: "✂️ Agendamento Confirmado!",
    body: `Olá {{cliente_nome}},

Seu agendamento foi confirmado com sucesso!

Serviço: {{servico}}
Profissional: {{profissional}}
Data: {{data}}
Horário: {{hora}}

Estamos te esperando! 😄`,
  },
  lembrete_24h: {
    type: "lembrete_24h",
    subject: "📅 Lembrete: Seu agendamento é amanhã!",
    body: `Olá {{cliente_nome}},

Este é um lembrete de que seu agendamento é amanhã!

Serviço: {{servico}}
Profissional: {{profissional}}
Data: {{data}}
Horário: {{hora}}

Nos vemos lá! 😄`,
  },
  lembrete_2h: {
    type: "lembrete_2h",
    subject: "⏰ Lembrete: Seu agendamento é em breve!",
    body: `Olá {{cliente_nome}},

Este é um lembrete de que seu agendamento é em breve!

Serviço: {{servico}}
Profissional: {{profissional}}
Data: {{data}}
Horário: {{hora}}

Estamos te esperando! 😄`,
  },
};

const VARIABLES = [
  { key: "{{cliente_nome}}", desc: "Nome do cliente" },
  { key: "{{servico}}", desc: "Nome do serviço" },
  { key: "{{profissional}}", desc: "Nome do profissional" },
  { key: "{{data}}", desc: "Data do agendamento" },
  { key: "{{hora}}", desc: "Horário do agendamento" },
];

const EmailTemplatesEditor = () => {
  const { tenantId } = useTenant();
  const [templates, setTemplates] = useState<Record<string, Template>>({ ...DEFAULT_TEMPLATES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("message_templates" as any)
        .select("type, subject, body")
        .eq("tenant_id", tenantId);

      if (data && (data as any[]).length > 0) {
        const merged = { ...DEFAULT_TEMPLATES };
        (data as any[]).forEach((t: any) => {
          if (merged[t.type]) {
            merged[t.type] = { type: t.type, subject: t.subject, body: t.body };
          }
        });
        setTemplates(merged);
      }
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const updateTemplate = (type: string, field: "subject" | "body", value: string) => {
    setTemplates(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const resetTemplate = (type: string) => {
    setTemplates(prev => ({
      ...prev,
      [type]: { ...DEFAULT_TEMPLATES[type] },
    }));
    toast.info("Template restaurado para o padrão");
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      for (const [type, template] of Object.entries(templates)) {
        await supabase
          .from("message_templates" as any)
          .upsert({
            tenant_id: tenantId,
            type,
            subject: template.subject,
            body: template.body,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "tenant_id,type" });
      }
      toast.success("Templates de email salvos!");
    } catch (err: any) {
      toast.error("Erro ao salvar templates", { description: err.message });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground text-sm">Carregando templates...</p>;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5" />
        <h3 className="font-semibold">Mensagens Automáticas de Email</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Personalize as mensagens de email enviadas automaticamente para seus clientes.
      </p>

      {/* Variables reference */}
      <div className="p-3 rounded-lg border bg-muted/30 mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <code key={v.key} className="text-xs bg-muted px-2 py-1 rounded font-mono" title={v.desc}>
              {v.key}
            </code>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {TEMPLATE_TYPES.map(({ type, label }) => (
          <div key={type} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{label}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetTemplate(type)}
                className="text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar padrão
              </Button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assunto</label>
              <Input
                value={templates[type]?.subject || ""}
                onChange={(e) => updateTemplate(type, "subject", e.target.value)}
                placeholder="Assunto do email"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem</label>
              <Textarea
                value={templates[type]?.body || ""}
                onChange={(e) => updateTemplate(type, "body", e.target.value)}
                placeholder="Corpo do email"
                className="min-h-[120px] font-mono text-sm"
              />
            </div>
            <div className="p-3 rounded border bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-1">Pré-visualização:</p>
              <p className="text-xs whitespace-pre-wrap">
                {(templates[type]?.body || "")
                  .replace(/\{\{cliente_nome\}\}/g, "João Silva")
                  .replace(/\{\{servico\}\}/g, "Corte Masculino")
                  .replace(/\{\{profissional\}\}/g, "Carlos")
                  .replace(/\{\{data\}\}/g, "15/03/2026")
                  .replace(/\{\{hora\}\}/g, "14:00")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full mt-4 gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Templates de Email"}
      </Button>
    </div>
  );
};

export default EmailTemplatesEditor;
