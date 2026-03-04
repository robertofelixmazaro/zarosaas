import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, User, Phone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import zaroLogo from "@/assets/zaro-logo.png";

const SaasSignupPage = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
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

    setLoading(true);
    const { error: signupErr } = await signUp(email, password, {
      name,
      cpf: cpf.replace(/\D/g, ""),
      phone: phone.replace(/\D/g, ""),
      whatsapp: whatsapp.replace(/\D/g, ""),
    });

    if (signupErr) {
      toast.error("Erro ao criar conta: " + signupErr.message);
      setLoading(false);
      return;
    }

    // Try to sign in immediately
    const { error: loginErr } = await signIn(email, password);
    if (loginErr) {
      toast.info("Conta criada! Verifique seu e-mail para confirmar e depois faça login.");
      navigate("/entrar");
    } else {
      toast.success("Conta criada com sucesso!");
      navigate("/novo-negocio");
    }
    setLoading(false);
  };

  const isValid = name && email && password && confirmPassword && password === confirmPassword && password.length >= 6;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 justify-center mb-8">
          <img src={zaroLogo} alt="Zaro Logo" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">ZARO AGENDAMENTOS</span>
        </Link>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Criar Conta</h2>
            <p className="text-sm text-muted-foreground">Preencha seus dados para começar</p>
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
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="CPF" className="pl-10" />
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
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !isValid}>
              {loading ? "Criando conta..." : "Cadastrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/entrar" className="text-primary font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SaasSignupPage;
