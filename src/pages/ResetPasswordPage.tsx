import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
    } else {
      toast.success("Senha redefinida com sucesso!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg mx-auto mb-6">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Link inválido</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Este link de recuperação é inválido ou expirou.
          </p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 justify-center mb-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Nova Senha</span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-1">Redefinir Senha</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Digite sua nova senha abaixo
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha"
                className="pl-10 pr-11 h-11"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="pl-10 h-11"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Salvando..." : "Redefinir Senha"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-5">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
