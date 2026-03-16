import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { detectTenantSlug } from "@/lib/tenantResolver";
import { getTenantBasePath } from "@/lib/tenantUrl";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type LoginView = "login" | "forgot";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, userRole, loading: authLoading, roleLoading, refreshUserRole } = useAuth();
  const { tenantId, tenantSlug, tenant } = useTenant();
  const tenantDetection = detectTenantSlug();
  const isCustomDomainLogin = tenantDetection.source === "custom_domain";
  const basePath = getTenantBasePath(tenantSlug);
  const adminRedirect = isCustomDomainLogin ? "/admin" : (basePath ? `${basePath}/admin` : "/dashboard");
  const staffRedirect = "/staff/dashboard";
  const [view, setView] = useState<LoginView>("login");
  const isForgot = view === "forgot";
  const [forgotLoading, setForgotLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    if (authLoading || roleLoading || !user || !userRole) return;

    if (userRole === "super_admin") {
      navigate("/superadmin/dashboard", { replace: true });
      return;
    }

    if (userRole === "affiliate") {
      navigate("/affiliate/dashboard", { replace: true });
      return;
    }

    if (userRole === "staff") {
      navigate(staffRedirect, { replace: true });
      return;
    }

    if (userRole === "admin") {
      navigate(adminRedirect, { replace: true });
      return;
    }

    navigate(basePath || "/", { replace: true });
  }, [authLoading, roleLoading, user, userRole, navigate, adminRedirect, staffRedirect, basePath]);

  useEffect(() => {
    if (!tenantId) return;
    const loadSettings = async () => {
      const { data: lpData } = await supabase
        .from("landing_page_settings" as any)
        .select("settings")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (lpData && (lpData as any).settings) {
        const s = (lpData as any).settings;
        if (s.logo_url) setLogoUrl(s.logo_url);
        if (s.shop_name) setShopName(s.shop_name);
        return;
      }
      const { data } = await supabase.from("site_settings").select("key, value").eq("tenant_id", tenantId).in("key", ["logo_url", "shop_name"]);
      if (data) {
        data.forEach((r: any) => {
          if (r.key === "logo_url" && r.value) setLogoUrl(r.value);
          if (r.key === "shop_name" && r.value) setShopName(r.value);
        });
      }
    };
    loadSettings();
  }, [tenantId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
      setLoading(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const currentUser = session?.session?.user;

    if (!currentUser) {
      toast.error("Não foi possível iniciar sua sessão.");
      setLoading(false);
      return;
    }

    let { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!roleData?.role) {
      const { data: provisionResult, error: provisionError } = await supabase.functions.invoke("provision-user");
      if (provisionError) {
        console.error("Provision error:", provisionError);
      }
      if (provisionResult?.role) {
        roleData = { role: provisionResult.role };
      }
    }

    if (roleData?.role) {
      await refreshUserRole();
    }

    const role = (roleData as any)?.role;

    if (role === "super_admin") {
      toast.success("Bem-vindo de volta!");
      navigate("/superadmin/dashboard", { replace: true });
    } else if (role === "affiliate") {
      toast.success("Bem-vindo de volta!");
      navigate("/affiliate/dashboard", { replace: true });
    } else if (role === "staff") {
      toast.success("Bem-vindo de volta!");
      navigate(staffRedirect, { replace: true });
    } else if (role === "admin") {
      toast.success("Bem-vindo de volta!");
      navigate(adminRedirect, { replace: true });
    } else {
      toast.success("Bem-vindo!");
      navigate(basePath || "/", { replace: true });
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
            {isForgot ? "Recuperar Senha" : "Bem-vindo de volta"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isForgot
              ? "Informe seu email para receber o link de recuperação"
              : "Faça login para acessar sua conta"}
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="pl-10 h-11" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="pl-10 pr-11 h-11" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="text-right">
                <button type="button" onClick={() => setView("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          {isForgot && (
            <div className="mt-5 text-center">
              <button onClick={() => setView("login")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                <span className="font-semibold text-primary">Voltar ao login</span>
              </button>
            </div>
          )}
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