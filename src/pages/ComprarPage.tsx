import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTrialEnabled } from "@/hooks/useTrialEnabled";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  features: any;
  max_barbers: number | null;
  max_services: number | null;
  max_appointments_month: number | null;
}

const ComprarPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trialEnabled } = useTrialEnabled();
  const refCode = searchParams.get("ref") || "";
  const status = searchParams.get("status") || "";


  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .gt("price", 0)
      .order("price", { ascending: true })
      .then(({ data }) => {
        const list = (data || []) as any[];
        setPlans(list);
        const preselect = searchParams.get("plan");
        if (preselect) {
          const found = list.find((p) => p.id === preselect);
          if (found) setSelectedPlan(found);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (status === "failure") {
      toast.error("Pagamento não concluído. Tente novamente.");
    } else if (status === "pending") {
      toast.info("Pagamento pendente. Você receberá acesso assim que for confirmado.");
    }
  }, [status]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    // Free trial enabled: no Mercado Pago, user goes straight to signup
    if (trialEnabled) {
      navigate(`/cadastrar?trial=1${refCode ? `&ref=${encodeURIComponent(refCode)}` : ""}`);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    if (!form.email.trim()) {
      toast.error("Informe seu email");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-checkout", {
        body: {
          plan_id: selectedPlan.id,
          client_email: form.email.trim(),
          client_name: form.name.trim(),
          ref_code: refCode,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Erro ao criar checkout");
        setProcessing(false);
        return;
      }

      // Redirect to Mercado Pago
      window.location.href = data.checkout_url;
    } catch {
      toast.error("Erro ao processar pagamento");
      setProcessing(false);
    }
  };

  const formatFeatures = (plan: Plan): string[] => {
    const features: string[] = [];
    if (plan.max_barbers) features.push(`${plan.max_barbers === 999 ? "Ilimitados" : plan.max_barbers} profissionais`);
    if (plan.max_services) features.push(`${plan.max_services === 999 ? "Ilimitados" : plan.max_services} serviços`);
    if (plan.max_appointments_month) features.push(`${plan.max_appointments_month === 99999 ? "Ilimitados" : plan.max_appointments_month} agendamentos/mês`);
    if (Array.isArray(plan.features)) {
      plan.features.forEach((f: any) => {
        if (typeof f === "string") features.push(f);
        else if (f?.name) features.push(f.name);
      });
    }
    return features;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src={zaroLogo} alt="Zaro Sistemas" className="h-10 w-10 object-contain" />
          <span className="text-lg font-bold tracking-tight">Zaro Sistemas</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <h1 className="text-3xl md:text-4xl font-bold">Comece a usar o Zaro Sistemas</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio e comece a gerenciar agendamentos de forma profissional.
          </p>
          {trialEnabled && (
            <Badge variant="secondary" className="text-sm">
              <Check className="h-3 w-3 mr-1" /> Teste grátis disponível — sem cartão de crédito
            </Badge>
          )}
          {refCode && (
            <Badge variant="secondary" className="text-sm">
              <Star className="h-3 w-3 mr-1" /> Indicado por um parceiro
            </Badge>
          )}
        </motion.div>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando planos...</p>
        ) : (
          <>
            {/* Plans */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedPlan?.id === plan.id ? "ring-2 ring-primary border-primary" : ""
                    }`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        {plan.name}
                      </CardTitle>
                      {plan.description && <CardDescription>{plan.description}</CardDescription>}
                      <div className="pt-2">
                        <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {formatFeatures(plan).map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Checkout Form */}
            {selectedPlan && !trialEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle>Finalizar Compra</CardTitle>
                    <CardDescription>
                      Plano selecionado: <strong>{selectedPlan.name}</strong> — R$ {selectedPlan.price.toFixed(2)}/mês
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Seu nome</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Seu email *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>
                    <Button onClick={handleCheckout} disabled={processing} className="w-full h-12 text-base">
                      {processing ? "Processando..." : "Pagar com Mercado Pago"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Pagamento seguro processado pelo Mercado Pago
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ComprarPage;
