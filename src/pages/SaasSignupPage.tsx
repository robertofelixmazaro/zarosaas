import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, User, Phone, CreditCard, Rocket, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCpf, validateCpf, formatPhone } from "@/lib/cpfValidator";
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

const SaasSignupPage = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("admin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setCpf(formatted);
    const stripped = value.replace(/\D/g, "");
    if (stripped.length === 11) {
      setCpfError(validateCpf(stripped) ? "" : "CPF inválido");
    } else {
      setCpfError("");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectPath = accountType === "affiliate" ? "/affiliate/dashboard" : "/admin";
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${redirectPath}`,
      });
      if (error) {
        toast.error("Erro ao entrar com Google: " + (error as Error).message);
      }
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    }
    setGoogleLoading(false);
  };

  const createWelcomeNotification = async (userId: string, userPhone: string, userWhatsapp: string) => {
    try {
      const message = accountType === "affiliate"
        ? "Olá! Bem-vindo ao ZARO AGENDAMENTOS 🚀\n\nSua conta de afiliado foi criada com sucesso.\n\nAcesse seu painel para começar a vender e ganhar comissões."
        : "Olá! Bem-vindo ao ZARO AGENDAMENTOS 🚀\n\nSua conta foi criada com sucesso.\n\nAgora vamos configurar seu negócio para começar a receber agendamentos.";
      await supabase.from("user_notifications" as any).insert({
        user_id: userId,
        phone: userPhone.replace(/\D/g, ""),
        whatsapp: userWhatsapp.replace(/\D/g, ""),
        message_text: message,
        message_status: "pending",
      });
    } catch (err) {
      console.error("Error creating welcome notification:", err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    const strippedCpf = cpf.replace(/\D/g, "");
    if (strippedCpf.length > 0 && !validateCpf(strippedCpf)) {
      toast.error("CPF inválido");
      return;
    }

    setLoading(true);
    const { error: signupErr } = await signUp(email, password, {
      name,
      cpf: strippedCpf,
      phone: phone.replace(/\D/g, ""),
      whatsapp: whatsapp.replace(/\D/g, ""),
      account_type: accountType,
    });

    if (signupErr) {
      toast.error("Erro ao criar conta: " + signupErr.message);
      setLoading(false);
      return;
    }

    const { error: loginErr } = await signIn(email, password);
    if (loginErr) {
      toast.info("Conta criada! Faça login para continuar.");
      navigate("/login");
    } else {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        await createWelcomeNotification(session.session.user.id, phone, whatsapp);
      }
      toast.success("Conta criada com sucesso! 🚀");
      if (accountType === "affiliate") {
        navigate("/affiliate/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const isValid = name && email && password && confirmPassword && password === confirmPassword && password.length >= 6 && !cpfError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-6">
          <img src={zaroLogo} alt="Zaro Logo" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">ZARO AGENDAMENTOS</span>
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
              Escolha como deseja usar a plataforma
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
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="pl-10" required />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="pl-10" required />
            </div>
            <div>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={cpf} onChange={(e) => handleCpfChange(e.target.value)} placeholder="CPF (opcional)" className="pl-10" />
              </div>
              {cpfError && <p className="text-xs text-destructive mt-1">{cpfError}</p>}
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="Telefone" className="pl-10" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={whatsapp} onChange={(e) => setWhatsapp(formatPhone(e.target.value))} placeholder="WhatsApp" className="pl-10" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (mín. 6 caracteres)"
                className="pl-10 pr-10"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar senha"
                  className="pl-10 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!passwordsMatch && <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading || !isValid}>
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
