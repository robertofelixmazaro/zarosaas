import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Phone, MapPin, Building2, Scissors, Sparkles, Stethoscope, Briefcase, LayoutGrid, Check, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const businessTypes = [
  { id: "barbershop", label: "Barbearia", icon: Scissors, description: "Cortes, barbas, tratamentos masculinos" },
  { id: "salon", label: "Salão de Beleza", icon: Sparkles, description: "Cabelo, unhas, maquiagem, estética" },
  { id: "clinic", label: "Clínica", icon: Stethoscope, description: "Consultas, exames, procedimentos" },
  { id: "consulting", label: "Consultório", icon: Briefcase, description: "Atendimentos e consultorias" },
  { id: "other", label: "Outro", icon: LayoutGrid, description: "Personalize do zero" },
] as const;

type BusinessType = typeof businessTypes[number]["id"];

const defaultServicesByType: Record<BusinessType, { name: string; price: number; duration_minutes: number; icon: string; description: string }[]> = {
  barbershop: [
    { name: "Corte Masculino", price: 40, duration_minutes: 30, icon: "✂️", description: "Corte moderno ou clássico" },
    { name: "Barba", price: 25, duration_minutes: 20, icon: "🪒", description: "Barba na navalha com toalha quente" },
    { name: "Corte + Barba", price: 55, duration_minutes: 45, icon: "💈", description: "Combo corte e barba completa" },
    { name: "Sobrancelha", price: 15, duration_minutes: 10, icon: "👁️", description: "Design de sobrancelha" },
    { name: "Hidratação Capilar", price: 35, duration_minutes: 30, icon: "💧", description: "Tratamento capilar profundo" },
  ],
  salon: [
    { name: "Corte Feminino", price: 60, duration_minutes: 45, icon: "✂️", description: "Corte com lavagem e finalização" },
    { name: "Escova", price: 40, duration_minutes: 30, icon: "💇", description: "Escova modeladora" },
    { name: "Coloração", price: 120, duration_minutes: 90, icon: "🎨", description: "Tintura completa" },
    { name: "Manicure", price: 30, duration_minutes: 30, icon: "💅", description: "Manicure com esmaltação" },
    { name: "Pedicure", price: 35, duration_minutes: 40, icon: "🦶", description: "Pedicure completa" },
  ],
  clinic: [
    { name: "Consulta", price: 150, duration_minutes: 30, icon: "🩺", description: "Consulta padrão" },
    { name: "Retorno", price: 80, duration_minutes: 20, icon: "🔄", description: "Consulta de retorno" },
    { name: "Avaliação", price: 100, duration_minutes: 45, icon: "📋", description: "Avaliação completa" },
    { name: "Procedimento Simples", price: 200, duration_minutes: 60, icon: "💉", description: "Procedimento de rotina" },
  ],
  consulting: [
    { name: "Consulta Inicial", price: 200, duration_minutes: 60, icon: "📊", description: "Primeira consulta" },
    { name: "Acompanhamento", price: 120, duration_minutes: 30, icon: "📝", description: "Sessão de acompanhamento" },
    { name: "Sessão Completa", price: 250, duration_minutes: 90, icon: "🎯", description: "Sessão estendida" },
  ],
  other: [],
};

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

const AdminSetupWizard = () => {
  const navigate = useNavigate();
  const { user, refreshUserRole } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [createdTenantSlug, setCreatedTenantSlug] = useState("");
  const [createdTenantId, setCreatedTenantId] = useState("");

  // Plan selection state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    if (!slug || slug === generateSlug(shopName)) {
      setSlug(generateSlug(val));
    }
  };

  const handleCreate = async () => {
    if (!shopName.trim() || !slug.trim() || !user || !businessType) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("setup-tenant", {
        body: {
          name: shopName,
          slug,
          phone: phone || null,
          address: address || null,
          business_type: businessType,
        },
      });

      if (fnErr) {
        toast.error("Erro ao criar negócio: " + fnErr.message);
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const tenantId = data.tenant_id;
      setCreatedTenantId(tenantId);
      setCreatedTenantSlug(data.slug);

      // Create default services based on business type
      const defaultServices = defaultServicesByType[businessType as BusinessType] || [];
      if (defaultServices.length > 0) {
        const serviceRows = defaultServices.map((s) => ({
          ...s,
          active: true,
          tenant_id: tenantId,
        }));
        await supabase.from("services" as any).insert(serviceRows as any);
      }

      await refreshUserRole();
      toast.success("Negócio criado com sucesso! 🎉");
      
      // Go to plan selection step
      setStep(3);
      loadPlans();
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setLoading(false);
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .gt("price", 0)
      .order("price", { ascending: true });
    setPlans((data || []) as any[]);
    setPlansLoading(false);
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

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-checkout", {
        body: {
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          plan_price: selectedPlan.price,
          client_email: user.email,
          client_name: user.user_metadata?.name || user.email,
          tenant_id: createdTenantId,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Erro ao criar checkout");
        setCheckoutLoading(false);
        return;
      }

      window.location.href = data.checkout_url;
    } catch {
      toast.error("Erro ao processar pagamento");
      setCheckoutLoading(false);
    }
  };

  const handleSkipPlan = () => {
    navigate(`/t/${createdTenantSlug}/admin`);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="rounded-xl border bg-card p-8 shadow-lg space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={cn("w-10 h-0.5", step >= s ? "bg-primary" : "bg-muted")} />}
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{s}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Tipo de Negócio</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione o tipo do seu negócio para gerar serviços automaticamente
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {businessTypes.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => setBusinessType(bt.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
                      businessType === bt.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      businessType === bt.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <bt.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{bt.label}</div>
                      <div className="text-xs text-muted-foreground">{bt.description}</div>
                    </div>
                  </button>
                ))}
              </div>

              <Button className="w-full h-11" onClick={() => setStep(2)} disabled={!businessType}>
                Continuar
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Dados do Negócio</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure as informações básicas
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={shopName} onChange={(e) => handleShopNameChange(e.target.value)} placeholder="Nome do negócio *" className="pl-10" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">URL: /t/{slug || "meu-negocio"}</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug-do-negocio" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (opcional)" className="pl-10" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço (opcional)" className="pl-10" />
                </div>
              </div>

              {businessType && businessType !== "other" && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Serviços que serão criados automaticamente:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultServicesByType[businessType as BusinessType]?.map((s, i) => (
                      <span key={i} className="text-xs bg-background border rounded-full px-2.5 py-0.5">
                        {s.icon} {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1 h-11" onClick={handleCreate} disabled={loading || !shopName.trim() || !slug.trim()}>
                  {loading ? "Criando..." : "Criar Negócio"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sua loja foi criada! Agora escolha um plano para desbloquear todos os recursos.
                </p>
              </div>

              {plansLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando planos...</p>
              ) : plans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum plano disponível no momento.</p>
                  <Button onClick={handleSkipPlan}>Ir para o painel</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {plans.map((plan, i) => (
                      <Card
                        key={plan.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-lg",
                          selectedPlan?.id === plan.id ? "ring-2 ring-primary border-primary" : ""
                        )}
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-primary" />
                            {plan.name}
                          </CardTitle>
                          {plan.description && <CardDescription className="text-xs">{plan.description}</CardDescription>}
                          <div className="pt-1">
                            <span className="text-2xl font-bold">R$ {plan.price.toFixed(2)}</span>
                            <span className="text-muted-foreground text-sm">/mês</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {formatFeatures(plan).map((f, j) => (
                              <li key={j} className="flex items-center gap-2 text-sm">
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button
                      className="w-full h-12 text-base"
                      onClick={handleSubscribe}
                      disabled={!selectedPlan || checkoutLoading}
                    >
                      {checkoutLoading ? "Processando..." : selectedPlan ? `Assinar ${selectedPlan.name} — R$ ${selectedPlan.price.toFixed(2)}/mês` : "Selecione um plano"}
                    </Button>
                    <button
                      type="button"
                      onClick={handleSkipPlan}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Começar com o teste grátis →
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSetupWizard;
