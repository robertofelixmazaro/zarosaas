import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import AdminSetupWizard from "@/pages/admin/AdminSetupWizard";
import { TenantProvider } from "@/contexts/TenantContext";

const AdminRouter = () => {
  const { user, loading, userRole } = useAuth();
  const [checking, setChecking] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("tenant_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (profile && (profile as any).tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants" as any)
          .select("slug")
          .eq("id", (profile as any).tenant_id)
          .maybeSingle();

        if (tenant) {
          setTenantSlug((tenant as any).slug);
          setHasTenant(true);
        } else {
          setHasTenant(false);
        }
      } else {
        setHasTenant(false);
      }
      setChecking(false);
    };
    check();
  }, [user]);

  if (loading || checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) return <Navigate to="/entrar" replace />;

  // User has tenant → redirect to tenant admin
  if (hasTenant && tenantSlug) {
    return <Navigate to={`/t/${tenantSlug}/admin`} replace />;
  }

  // No tenant yet → show setup wizard inside a minimal layout
  return (
    <TenantProvider>
      <AdminLayout>
        <AdminSetupWizard />
      </AdminLayout>
    </TenantProvider>
  );
};

export default AdminRouter;
