import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, User, Phone, CreditCard, Rocket, Store, Users, Globe, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCpfCnpj, validateCpfCnpj, formatPhone, generateSlug } from "@/lib/cpfValidator";
import zaroLogo from "@/assets/zaro-logo.png";

type AccountType = "admin" | "affiliate";

const AccountTypeSelector = ({ value, onChange }: { value: AccountType; onChange: (v: AccountType) => void }) => (
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => onChange("admin")}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        value === "admin"
          ? "border-primary bg-primary/5 shadow-md"
          : "border-muted hover:border-primary/40"
      }`}
    >
      <Store className={`h-7 w-7 ${value === "admin" ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-sm font-semibold ${value === "admin" ? "text-primary" : "text-foreground"}`}>
        Criar minha loja
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight">
        Gerencie agendamentos do seu negócio
      </span>
    </button>
    <button
      type="button"
      onClick={() => onChange("affiliate")}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        value === "affiliate"
          ? "border-primary bg-primary/5 shadow-md"
          : "border-muted hover:border-primary/40"
      }`}
    >
      <Users className={`h-7 w-7 ${value === "affiliate" ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-sm font-semibold ${value === "affiliate" ? "text-primary" : "text-foreground"}`}>
        Quero ser afiliado
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight">
        Ganhe comissões vendendo o sistema
      </span>
    </button>
  </div>
);

interface FieldErrorProps {
  error?: string;
}
const FieldError = ({ error }: FieldErrorProps) =>
  error ? <p className="text-xs text-destructive mt-1">{error}</p> : null;

const SaasSignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("admin");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const refCode = searchParams.get("ref") || localStorage.getItem("zaro_ref_code") || "";

  useEffect(() => {
    if (refCode) localStorage.setItem("zaro_ref_code", refCode);
  }, [refCode]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Auto-generate slug from store name
  useEffect(() => {
    if (accountType === "admin" && !slugManuallyEdited && storeName) {
      setSlug(generateSlug(storeName));
    }
  }, [storeName, accountType, slugManuallyEdited]);

  const markTouched = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  // Validation
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "Nome completo é obrigatório";
  if (!email.trim()) errors.email = "E-mail é obrigatório";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Email inválido.";

  const phoneDigits = phone.replace(/\D/g, "");
  if (!phoneDigits) errors.phone = "Telefone é obrigatório";
  else if (phoneDigits.length < 10 || phoneDigits.length > 11) errors.phone = "Número de celular inválido.";

  const strippedDoc = cpfCnpj.replace(/\D/g, "");
  if (!strippedDoc) errors.cpfCnpj = "CPF ou CNPJ é obrigatório";
  else if (strippedDoc.length !== 11 && strippedDoc.length !== 14) errors.cpfCnpj = "CPF ou CNPJ incompleto";
  else if (!validateCpfCnpj(strippedDoc)) errors.cpfCnpj = strippedDoc.length === 11 ? "CPF inválido. Por favor insira um CPF válido." : "CNPJ inválido. Por favor insira um CNPJ válido.";

  if (accountType === "admin") {
    if (!storeName.trim()) errors.storeName = "Nome da loja é obrigatório";
    if (!slug.trim()) errors.slug = "Slug é obrigatório";
    else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) errors.slug = "Slug inválido (use letras, números e hífens)";
  }

  if (!password) errors.password = "Senha é obrigatória";
  else if (password.length < 6) errors.password = "A senha deve ter pelo menos 6 caracteres";
  if (!confirmPassword) errors.confirmPassword = "Confirme sua senha";
  else if (password !== confirmPassword) errors.confirmPassword = "As senhas não coincidem";
  if (!acceptTerms) errors.acceptTerms = "Você deve aceitar os termos de uso";

  const isValid = Object.keys(errors).length === 0;

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (error) toast.error("Erro ao entrar com Google: " + (error as Error).message);
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setGoogleLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors
    const allFields = ["name", "email", "phone", "cpfCnpj", "storeName", "slug", "password", "confirmPassword", "acceptTerms"];
    const allTouched: Record<string, boolean> = {};
    allFields.forEach((f) => (allTouched[f] = true));
    setTouched(allTouched);

    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);

    // Check for duplicate CPF before creating the account
    try {
      const { data: existingCpf } = await supabase
        .from("profiles")
        .select("id")
        .eq("cpf", strippedDoc)
        .maybeSingle();

      if (existingCpf) {
        toast.error("Já existe uma conta com este CPF.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("CPF check error:", err);
    }

    const metadata: Record<string, string> = {
      name: name.trim(),
      cpf: strippedDoc,
      phone: phone.replace(/\D/g, ""),
      whatsapp: phone.replace(/\D/g, ""),
      account_type: accountType,
    };
    if (refCode) metadata.ref_code = refCode;
    if (accountType === "admin") {
      metadata.store_name = storeName.trim();
      metadata.store_slug = slug.trim().toLowerCase();
    }

    const { error: signupErr } = await signUp(email, password, metadata);

    if (signupErr) {
      const msg = signupErr.message?.includes("already been registered")
        ? "Já existe uma conta com este email."
        : "Erro ao criar conta: " + signupErr.message;
      toast.error(msg);
      setLoading(false);
      return;
    }

    // Wait for trigger to create profile/role
    await new Promise((r) => setTimeout(r, 1500));

    // Provision fallback
    try {
      await supabase.functions.invoke("provision-user");
    } catch (err) {
      console.error("Provision fallback:", err);
    }

    // If admin, auto-create the store
    if (accountType === "admin") {
      try {
        const { data, error: storeErr } = await supabase.functions.invoke("setup-tenant", {
          body: {
            name: storeName.trim(),
            slug: slug.trim().toLowerCase(),
            phone: phone.replace(/\D/g, ""),
          },
        });

        if (storeErr) {
          console.error("Store creation error:", storeErr);
          toast.error("Conta criada, mas houve erro ao criar a loja. Configure no painel.");
          navigate("/dashboard", { replace: true });
          setLoading(false);
          return;
        }

        const tenantSlug = data?.slug || slug.trim().toLowerCase();
        toast.success("Conta e loja criadas com sucesso!");
        navigate(`/t/${tenantSlug}/admin`, { replace: true });
      } catch (err) {
        console.error("Store creation error:", err);
        toast.error("Conta criada, mas houve erro ao criar a loja.");
        navigate("/dashboard", { replace: true });
      }
    } else {
      // Affiliate
      toast.success("Conta criada com sucesso!");
      navigate("/affiliate/dashboard", { replace: true });
    }

    setLoading(false);
  };

  const showAdminFields = accountType === "admin";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-6">
          <img src={zaroLogo} alt="Zaro Sistemas" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">Zaro Sistemas</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border bg-card p-8 shadow-lg space-y-5"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Crie sua conta</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Preencha todos os campos para criar sua conta
            </p>
          </div>

          <AccountTypeSelector value={accountType} onChange={setAccountType} />

          <Button
            variant="outline"
            className="w-full gap-3 h-11"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? "Conectando..." : "Continuar com Google"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase">ou</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            {/* Nome completo */}
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched("name")}
                  placeholder="Nome completo *"
                  className={`pl-10 ${touched.name && errors.name ? "border-destructive" : ""}`}
                />
              </div>
              {touched.name && <FieldError error={errors.name} />}
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  placeholder="E-mail *"
                  className={`pl-10 ${touched.email && errors.email ? "border-destructive" : ""}`}
                />
              </div>
              {touched.email && <FieldError error={errors.email} />}
            </div>

            {/* Telefone */}
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onBlur={() => markTouched("phone")}
                  placeholder="Telefone / WhatsApp *"
                  className={`pl-10 ${touched.phone && errors.phone ? "border-destructive" : ""}`}
                />
              </div>
              {touched.phone && <FieldError error={errors.phone} />}
            </div>

            {/* CPF ou CNPJ */}
            <div>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  onBlur={() => markTouched("cpfCnpj")}
                  placeholder="CPF ou CNPJ *"
                  className={`pl-10 ${touched.cpfCnpj && errors.cpfCnpj ? "border-destructive" : ""}`}
                />
              </div>
              {touched.cpfCnpj && <FieldError error={errors.cpfCnpj} />}
            </div>

            {/* Store fields - only for admin */}
            {showAdminFields && (
              <>
                <div>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      onBlur={() => markTouched("storeName")}
                      placeholder="Nome da empresa ou loja *"
                      className={`pl-10 ${touched.storeName && errors.storeName ? "border-destructive" : ""}`}
                    />
                  </div>
                  {touched.storeName && <FieldError error={errors.storeName} />}
                </div>

                <div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        setSlugManuallyEdited(true);
                      }}
                      onBlur={() => markTouched("slug")}
                      placeholder="slug-da-loja *"
                      className={`pl-10 ${touched.slug && errors.slug ? "border-destructive" : ""}`}
                    />
                  </div>
                  {slug && !errors.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      URL: zarosistemas.com.br/t/{slug}
                    </p>
                  )}
                  {touched.slug && <FieldError error={errors.slug} />}
                </div>
              </>
            )}

            {/* Senha */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched("password")}
                  placeholder="Senha (mín. 6 caracteres) *"
                  className={`pl-10 pr-10 ${touched.password && errors.password ? "border-destructive" : ""}`}
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && <FieldError error={errors.password} />}
            </div>

            {/* Confirmar senha */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => markTouched("confirmPassword")}
                  placeholder="Confirmar senha *"
                  className={`pl-10 pr-10 ${touched.confirmPassword && errors.confirmPassword ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.confirmPassword && <FieldError error={errors.confirmPassword} />}
            </div>

            {/* Aceite de termos */}
            <div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => {
                    setAcceptTerms(v === true);
                    markTouched("acceptTerms");
                  }}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  Li e aceito os{" "}
                  <span className="text-primary font-medium hover:underline">termos de uso</span>{" "}
                  e a{" "}
                  <span className="text-primary font-medium hover:underline">política de privacidade</span>
                </label>
              </div>
              {touched.acceptTerms && <FieldError error={errors.acceptTerms} />}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Criando conta..." : accountType === "affiliate" ? "Criar conta de afiliado" : "Criar minha loja"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </motion.div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SaasSignupPage;
