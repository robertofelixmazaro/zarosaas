import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically picks up the tokens from the URL hash/params
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[Auth Callback] Session error:", sessionError);
          setError("Erro ao recuperar sessão. Tente novamente.");
          setTimeout(() => navigate("/login", { replace: true }), 3000);
          return;
        }

        if (!session?.user) {
          console.warn("[Auth Callback] No session found, redirecting to login");
          navigate("/login", { replace: true });
          return;
        }

        const userId = session.user.id;

        // Check user role
        let { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        // If no role, try provisioning
        if (!roleData?.role) {
          try {
            const { data: provisionResult } = await supabase.functions.invoke("provision-user");
            if (provisionResult?.role) {
              roleData = { role: provisionResult.role };
            } else {
              const { data: retryRole } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", userId)
                .maybeSingle();
              roleData = retryRole;
            }
          } catch (err) {
            console.error("[Auth Callback] Provision error:", err);
          }
        }

        const role = roleData?.role;

        // If user is brand new from Google (no role yet), send to signup completion
        if (!role) {
          navigate("/cadastrar", { replace: true });
          return;
        }

        // Redirect by role
        switch (role) {
          case "super_admin":
            navigate("/superadmin/dashboard", { replace: true });
            break;
          case "affiliate":
            navigate("/affiliate/dashboard", { replace: true });
            break;
          case "staff":
            navigate("/staff/dashboard", { replace: true });
            break;
          case "admin":
          default:
            navigate("/dashboard", { replace: true });
            break;
        }
      } catch (err) {
        console.error("[Auth Callback] Unexpected error:", err);
        setError("Erro inesperado. Redirecionando...");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm">Autenticando...</p>
        </>
      )}
    </div>
  );
};

export default AuthCallbackPage;
