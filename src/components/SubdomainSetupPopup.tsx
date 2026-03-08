import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Globe, Loader2 } from "lucide-react";

interface SubdomainSetupPopupProps {
  tenantId: string;
  currentSlug: string;
  onComplete: (newSlug: string) => void;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/;

const SubdomainSetupPopup = ({ tenantId, currentSlug, onComplete }: SubdomainSetupPopupProps) => {
  const [slug, setSlug] = useState(currentSlug || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sanitize = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-");

  const handleChange = (val: string) => {
    const clean = sanitize(val);
    setSlug(clean);
    setError("");
  };

  const validate = (val: string): string | null => {
    if (val.length < 3) return "Mínimo de 3 caracteres.";
    if (val.length > 50) return "Máximo de 50 caracteres.";
    if (val.startsWith("-") || val.endsWith("-")) return "Não pode começar ou terminar com hífen.";
    if (!/^[a-z0-9-]+$/.test(val)) return "Apenas letras minúsculas, números e hífen.";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate(slug);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    // Check uniqueness
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .neq("id", tenantId)
      .maybeSingle();

    if (existing) {
      setError("Este endereço já está em uso. Escolha outro.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({ slug })
      .eq("id", tenantId);

    if (updateError) {
      setError("Erro ao salvar: " + updateError.message);
      setSaving(false);
      return;
    }

    toast.success("Endereço configurado com sucesso!");
    setSaving(false);
    onComplete(slug);
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Configure o endereço da sua empresa
          </DialogTitle>
          <DialogDescription>
            Escolha o subdomínio da sua página. Esse será o endereço público da sua empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="slug-input">Subdomínio</Label>
            <div className="flex items-center gap-0 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="text-sm text-muted-foreground bg-muted px-3 py-2.5 border-r whitespace-nowrap">
                https://
              </span>
              <Input
                id="slug-input"
                value={slug}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="meu-negocio"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                autoFocus
              />
              <span className="text-sm text-muted-foreground bg-muted px-3 py-2.5 border-l whitespace-nowrap">
                .zarosistemas.com.br
              </span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífen. Mínimo 3 caracteres.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !slug} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar endereço"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubdomainSetupPopup;
