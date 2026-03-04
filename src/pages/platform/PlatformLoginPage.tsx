import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PlatformLoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, userRole, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user && userRole === "super_admin") {
      navigate("/admin-platform", { replace: true });
    }
  }, [authLoading, user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
      setLoading(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.session.user.id)
        .single();

      const role = (roleData as any)?.role;
      if (role === "super_admin") {
        toast.success("Bem-vindo, Super Admin!");
        navigate("/admin-platform");
      } else {
        toast.error("Acesso negado", { description: "Você não tem permissão de super administrador." });
        await supabase.auth.signOut();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 justify-center mb-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg border border-primary/20">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Zaro Agendamentos</span>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Painel da Plataforma</span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-1">Acesso Administrativo</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Entre com suas credenciais de super administrador
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-10 h-11"
                required
                autoComplete="off"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="pl-10 pr-11 h-11"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito a administradores da plataforma
        </p>
      </div>
    </div>
  );
};

export default PlatformLoginPage;
