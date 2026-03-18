import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTenantExternalUrl } from "@/lib/tenantUrl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Loader2, Sparkles, UserPlus, PartyPopper, Copy, ExternalLink, ArrowRight, Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OnboardingWizardProps {
  tenantId: string;
  currentSlug: string;
  onComplete: (newSlug: string) => void;
}

const OnboardingWizard = ({ tenantId, currentSlug, onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 - Subdomain
  const [slug, setSlug] = useState(currentSlug || "");
  const [slugError, setSlugError] = useState("");

  // Final slug after save
  const [finalSlug, setFinalSlug] = useState(currentSlug || "");
  const [copied, setCopied] = useState(false);

  // Auto-generate slug from current slug if it looks auto-generated (has timestamp suffix)
  // Otherwise keep as-is for editing
  const sanitizeSlug = (val: string) =>
    val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-");

  const validateSlug = (val: string): string | null => {
    if (val.length < 3) return "Mínimo de 3 caracteres.";
    if (val.length > 50) return "Máximo de 50 caracteres.";
    if (val.startsWith("-") || val.endsWith("-")) return "Não pode começar ou terminar com hífen.";
    if (!/^[a-z0-9-]+$/.test(val)) return "Apenas letras minúsculas, números e hífen.";
    return null;
  };

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_hidden_${tenantId}`, "true");
    onComplete(finalSlug || currentSlug);
  };

  const handleStep1 = async () => {
    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }

    setSaving(true);
    setSlugError("");

    // Validate uniqueness
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .neq("id", tenantId)
      .maybeSingle();

    if (existing) {
      setSlugError("Este endereço já está em uso. Escolha outro.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("tenants").update({ slug }).eq("id", tenantId);
    if (error) {
      setSlugError("Erro ao salvar: " + error.message);
      setSaving(false);
      return;
    }

    setFinalSlug(slug);
    setSaving(false);
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    await supabase.from("tenants").update({ onboarding_completed: true } as any).eq("id", tenantId);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "subdomain_configured")
      .maybeSingle();
    if (!existing) {
      await supabase.from("site_settings").insert({
        tenant_id: tenantId,
        key: "subdomain_configured",
        value: "true",
      });
    }
    localStorage.removeItem(`onboarding_hidden_${tenantId}`);
    setSaving(false);
    onComplete(finalSlug);
  };

  const publicUrl = getTenantExternalUrl(finalSlug || slug);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const progressValue = (step / 4) * 100;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-4">
          {step < 4 && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold">Bem-vindo ao Zaro 👋</h2>
                <p className="text-sm text-muted-foreground mt-1">Vamos configurar sua empresa em poucos passos.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Passo {step} de 4</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            </>
          )}

          {/* STEP 1 - Subdomain */}
          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-primary">
                <Globe className="h-5 w-5" />
                <h3 className="font-semibold">Endereço da sua empresa</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente a partir do nome da empresa. Você pode editar se quiser.
              </p>
              <div className="space-y-2">
                <Label>Subdomínio</Label>
                <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-2.5 border-r whitespace-nowrap">
                    {window.location.origin}/t/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => { setSlug(sanitizeSlug(e.target.value)); setSlugError(""); }}
                    placeholder="meu-negocio"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    autoFocus
                  />
                </div>
                {slugError && <p className="text-sm text-destructive">{slugError}</p>}
                <p className="text-xs text-muted-foreground">Letras minúsculas, números e hífen. Mínimo 3 caracteres.</p>
              </div>
              <Button onClick={handleStep1} disabled={saving || !slug} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continuar
              </Button>
            </div>
          )}

          {/* STEP 2 - First Service */}
          {step === 2 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-semibold">Crie seu primeiro serviço</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome do serviço</Label>
                  <Input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ex: Corte Masculino, Consulta, etc."
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duração</Label>
                    <Select value={serviceDuration} onValueChange={setServiceDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button onClick={handleStep2} disabled={saving || !serviceName.trim()} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continuar
              </Button>
            </div>
          )}

          {/* STEP 3 - First Professional */}
          {step === 3 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-primary">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-semibold">Adicione um profissional</h3>
              </div>
              <div className="space-y-1.5">
                <Label>Nome do profissional</Label>
                <Input
                  value={professionalName}
                  onChange={(e) => setProfessionalName(e.target.value)}
                  placeholder="Ex: João Silva"
                  autoFocus
                />
              </div>
              <Button onClick={handleStep3} disabled={saving || !professionalName.trim()} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continuar
              </Button>
            </div>
          )}

          {/* STEP 4 - Done */}
          {step === 4 && (
            <div className="space-y-5 pt-2 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <PartyPopper className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Sua página está pronta! 🎉</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Compartilhe esse link com seus clientes para começar a receber agendamentos.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Endereço da sua página</p>
                <p className="text-sm font-medium break-all">{publicUrl}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar link"}
                </Button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" /> Abrir página
                  </Button>
                </a>
              </div>

              <Button onClick={handleFinish} disabled={saving} className="w-full gap-2" size="lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ir para o painel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
