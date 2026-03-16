import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, ShieldCheck, Clock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ExcluirContaPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    account_id: "",
    reason: "",
    confirmed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.confirmed) {
      toast({ title: "Confirmação necessária", description: "Marque a caixa de confirmação para prosseguir.", variant: "destructive" });
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e e-mail.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("account_deletion_requests" as any).insert({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        account_id: form.account_id.trim() || null,
        reason: form.reason.trim() || null,
      } as any);

      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Solicitação enviada</h2>
            <p className="text-muted-foreground text-sm">
              Sua solicitação de exclusão de conta foi registrada com sucesso.
              Nossa equipe processará a exclusão da conta e dados associados em até <strong>7 dias úteis</strong>.
            </p>
            <p className="text-muted-foreground text-sm">
              Você receberá uma confirmação no e-mail informado quando o processo for concluído.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Exclusão de Conta – Zaro Sistemas
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Você pode solicitar a exclusão permanente da sua conta e de todos os dados pessoais armazenados no sistema Zaro Sistemas,
            em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-5 pb-5 text-center space-y-2">
              <Trash2 className="w-5 h-5 mx-auto text-destructive" />
              <p className="text-xs text-muted-foreground">Dados pessoais, histórico de agendamentos e preferências serão removidos permanentemente.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5 text-center space-y-2">
              <Clock className="w-5 h-5 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">O processo de exclusão pode levar até 7 dias úteis para ser concluído.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5 text-center space-y-2">
              <ShieldCheck className="w-5 h-5 mx-auto text-green-600" />
              <p className="text-xs text-muted-foreground">Registros exigidos por obrigações legais poderão ser mantidos conforme a LGPD.</p>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formulário de Solicitação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" placeholder="Seu nome completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={100} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail da conta *</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} maxLength={255} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Usuário ou ID da conta (opcional)</Label>
                <Input id="account_id" placeholder="ID ou nome de usuário" value={form.account_id} onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))} maxLength={100} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da exclusão (opcional)</Label>
                <Textarea id="reason" placeholder="Conte-nos por que deseja excluir sua conta..." value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} maxLength={500} rows={3} />
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox id="confirm" checked={form.confirmed} onCheckedChange={(v) => setForm(p => ({ ...p, confirmed: !!v }))} />
                <Label htmlFor="confirm" className="text-sm leading-snug cursor-pointer">
                  Confirmo que desejo excluir minha conta e dados permanentemente. Entendo que esta ação é irreversível.
                </Label>
              </div>

              <Button type="submit" variant="destructive" className="w-full" disabled={loading || !form.confirmed}>
                {loading ? "Enviando..." : "Solicitar exclusão de conta"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Após a solicitação, nossa equipe processará a exclusão da conta e dados associados dentro do prazo informado.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>Dúvidas? Entre em contato: <a href="mailto:contato@zarosistemas.com" className="text-primary underline">contato@zarosistemas.com</a></span>
          </div>
          <p className="text-xs text-muted-foreground">
            <a href="https://www.zarosistemas.com.br" className="underline" target="_blank" rel="noopener noreferrer">www.zarosistemas.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExcluirContaPage;
