import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import zaroLogo from "@/assets/zaro-logo.png";
import { recordLoginHistory } from "@/lib/loginHistory";

const UnifiedLoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, userRole, loading: authLoading, roleLoading, refreshUserRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  const redirectByRole = useCallback((role: string) => {
    switch (role) {
      case "super_admin":
        navigate("/superadmin/dashboard", { replace: true });
        break;
      case "affiliate":
        navigate("/affiliate/dashboard", { replace: true });
        break;
      case "staff":
        navigate("/st/agenda", { replace: true });
        break;
      case "admin":
      default:
        navigate("/dashboard", { replace: true });
        break;
    }
  }, [navigate]);

  const checkProfileAndRedirect = useCallback(async (userId: string, role: string | null) => {
    console.log("[Auth Debug] checkProfileAndRedirect called", { userId, role });

    // Super admin always goes straight to dashboard - no profile check needed
    if (role === "super_admin") {
      console.log("[Auth Debug] Super admin detected, redirecting to superadmin dashboard");
      redirectByRole(role);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone, name")
      .eq("auth_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[Auth Debug] Profile query result:", { profile, profileError });

    if (profileError) {
      console.error("[Auth Debug] Erro ao verificar perfil:", profileError);
      toast.error("Não foi possível validar seu perfil agora. Tente novamente.");
      return;
    }

    console.log("[Auth Debug] Profile check:", { role, profile });

    // Redirect directly by role — all data is collected at signup
    redirectByRole(role || "admin");
  }, [navigate, redirectByRole]);

  useEffect(() => {
    if (authLoading || roleLoading || !user || loading) return;
    void checkProfileAndRedirect(user.id, userRole);
  }, [authLoading, roleLoading, user, userRole, loading, checkProfileAndRedirect]);

  // Email confirmation no longer required (auto-confirm enabled)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendConfirmation(false);

    const { error } = await signIn(email, password);
    if (error) {
      const message = (error.message || "").toLowerCase();

      if (message.includes("email not confirmed")) {
        setShowResendConfirmation(true);
        toast.error("Confirme seu email para ativar sua conta.");
      } else if (message.includes("invalid login credentials")) {
        toast.error("E-mail ou senha inválidos.");
      } else {
        toast.error("Erro ao entrar: " + error.message);
      }

      setLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      toast.error("Não foi possível iniciar sua sessão.");
      setLoading(false);
      return;
    }

    // Check if role exists
    let { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    // If no role found, try to provision via edge function
    if (!roleData?.role) {
      try {
        const { data: provisionResult, error: provisionError } = await supabase.functions.invoke("provision-user");
        if (provisionError) {
          console.error("Provision error:", provisionError);
        }
        if (provisionResult?.role) {
          roleData = { role: provisionResult.role };
        } else {
          // Retry fetching role after provisioning
          const { data: retryRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", currentUser.id)
            .maybeSingle();
          roleData = retryRole;
        }
      } catch (err) {
        console.error("Provision fallback error:", err);
      }
    }

    if (roleData?.role) {
      await refreshUserRole();
    } else {
      toast.warning("Finalize seu cadastro para continuar.");
    }

    toast.success("Login realizado com sucesso!");
    // Record login history (fire-and-forget)
    recordLoginHistory(currentUser.id).catch(() => {});
    await checkProfileAndRedirect(currentUser.id, roleData?.role ?? null);
    setLoading(false);
  };

  if (authLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 justify-center mb-8">
          <img src={zaroLogo} alt="Zaro Sistemas" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold tracking-tight">Zaro Sistemas</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border bg-card p-8 shadow-lg space-y-6"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">Entrar</h1>
            <p className="text-sm text-muted-foreground">Acesse sua conta</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default UnifiedLoginPage;
