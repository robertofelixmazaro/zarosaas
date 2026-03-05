import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PlatformLoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, userRole, loading: authLoading, roleLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_logo_url")
      .single()
      .then(({ data }) => {
        if (data?.value) setPlatformLogoUrl(data.value);
      });
  }, []);

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (userRole === "super_admin") {
      navigate("/admin-platform", { replace: true });
    } else if (userRole) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, roleLoading, user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
      setLoading(false);
      return;
    }
    // Redirect handled by useEffect above once role loads
    setLoading(false);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 justify-center mb-8">
          {platformLogoUrl ? (
            <img src={platformLogoUrl} alt="Logo da Plataforma" className="h-20 w-20 rounded-full object-cover shadow-lg border border-primary/20" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg border border-primary/20">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          )}
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

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                Lembrar de mim
              </Label>
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
