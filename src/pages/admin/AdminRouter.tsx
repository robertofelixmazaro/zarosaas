import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import AdminSetupWizard from "@/pages/admin/AdminSetupWizard";
import { TenantProvider } from "@/contexts/TenantContext";

const AdminRouter = () => {
  const { user, loading, roleLoading, userRole } = useAuth();
  const [checking, setChecking] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth AND role to fully load
    if (loading || roleLoading || !user) return;

    const check = async () => {
      // Super admins go to platform dashboard
      if (userRole === "super_admin") {
        setChecking(false);
        return;
      }

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
  }, [user, loading, roleLoading, userRole]);

  if (loading || roleLoading || checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) return <Navigate to="/entrar" replace />;

  // Super admin → platform
  if (userRole === "super_admin") {
    return <Navigate to="/admin-platform" replace />;
  }

  // User has tenant → redirect to tenant admin
  if (hasTenant && tenantSlug) {
    return <Navigate to={`/t/${tenantSlug}/admin`} replace />;
  }

  // No tenant yet → show setup wizard
  return (
    <TenantProvider>
      <AdminLayout>
        <AdminSetupWizard />
      </AdminLayout>
    </TenantProvider>
  );
};

export default AdminRouter;
