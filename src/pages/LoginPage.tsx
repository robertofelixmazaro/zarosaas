import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Mail, Lock, User, ArrowLeft, Phone, MapPin, CreditCard, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

type LoginView = "login" | "signup" | "forgot";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, userRole, loading: authLoading } = useAuth();
  const { tenantId, tenantSlug, tenant } = useTenant();
  const basePath = tenantSlug ? `/t/${tenantSlug}` : "";
  const [view, setView] = useState<LoginView>("login");
  const isLogin = view === "login";
  const isForgot = view === "forgot";
  const [forgotLoading, setForgotLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [shopName, setShopName] = useState("CAETANO BARBER");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && userRole) {
      if (userRole === "admin") {
        navigate(`${basePath}/admin`, { replace: true });
      } else {
        navigate(basePath || "/", { replace: true });
      }
    }
  }, [authLoading, user, userRole, navigate]);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["logo_url", "shop_name"]);
      if (data) {
        data.forEach((r: any) => {
          if (r.key === "logo_url" && r.value) setLogoUrl(r.value);
          if (r.key === "shop_name" && r.value) setShopName(r.value);
        });
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Erro ao entrar", { description: error.message });
      } else {
        // Check user role to redirect appropriately
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.session.user.id)
            .single();
          const role = (roleData as any)?.role;
          if (role === "admin" || role === "barber") {
            toast.success("Bem-vindo de volta!");
            navigate(`${basePath}/admin`);
          } else {
            toast.success("Bem-vindo!");
            navigate(basePath || "/");
          }
        } else {
          navigate(basePath || "/");
        }
      }
    } else {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        toast.error("CPF inválido", { description: "O CPF deve conter 11 dígitos." });
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, {
        name,
        cpf: cpfDigits,
        whatsapp,
        phone: whatsapp,
        tenant_id: tenantId || "",
        address_street: addressStreet,
        address_number: addressNumber,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip.replace(/\D/g, ""),
      });
      if (error) {
        const msg = error.message?.includes("duplicate")
          ? "Este CPF já está cadastrado."
          : error.message;
        toast.error("Erro ao criar conta", { description: msg });
      } else {
        toast.success("Conta criada com sucesso!");
        navigate(`${basePath}/admin`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to={basePath || "/"} className="flex flex-col items-center gap-3 justify-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20 shadow-lg" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
              <Scissors className="h-10 w-10 text-primary" />
            </div>
          )}
          <span className="text-2xl font-bold tracking-tight">{tenant?.name || shopName}</span>
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-1">
            {isForgot ? "Recuperar Senha" : isLogin ? "Bem-vindo de volta" : "Criar Conta"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isForgot
              ? "Informe seu email para receber o link de recuperação"
              : isLogin
              ? "Faça login para acessar sua conta"
              : "Preencha todos os dados para se cadastrar"}
          </p>

          {isForgot ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) {
                  toast.error("Erro ao enviar email", { description: error.message });
                } else {
                  toast.success("Email enviado!", { description: "Verifique sua caixa de entrada." });
                }
                setForgotLoading(false);
              }}
              className="space-y-4"
            >
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="pl-10 h-11" required />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={forgotLoading}>
                {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="pl-10 h-11" required />
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="CPF (000.000.000-00)" className="pl-10 h-11" required />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (com DDD)" className="pl-10 h-11" required />
                  </div>

                  <p className="text-xs font-medium text-muted-foreground pt-1">Endereço</p>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua / Avenida" className="pl-10 h-11" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Número" className="h-11" required />
                    <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} placeholder="Bairro" className="h-11" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="Cidade" className="h-11" required />
                    <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="Estado (UF)" maxLength={2} className="h-11" required />
                  </div>
                  <Input value={addressZip} onChange={(e) => setAddressZip(formatCEP(e.target.value))} placeholder="CEP (00000-000)" className="h-11" />
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="pl-10 h-11" required autoComplete="off" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="pl-10 pr-11 h-11" required minLength={6} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button type="button" onClick={() => setView("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
              </Button>
            </form>
          )}

          <div className="mt-5 text-center space-y-2">
            {isForgot ? (
              <button onClick={() => setView("login")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                <span className="font-semibold text-primary">Voltar ao login</span>
              </button>
            ) : (
              <button
                onClick={() => setView(isLogin ? "signup" : "login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? (
                  <>Não tem conta? <span className="font-semibold text-primary">Cadastre-se agora</span></>
                ) : (
                  <>Já tem conta? <span className="font-semibold text-primary">Entrar</span></>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-5">
          <Link to={basePath || "/"} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
