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
    if (loading || roleLoading || !user) return;

    const check = async () => {
      // Super admins go to their dashboard
      if (userRole === "super_admin") {
        setChecking(false);
        return;
      }

      // Affiliates go to their dashboard
      if (userRole === "affiliate") {
        setChecking(false);
        return;
      }

      // Staff go to their dashboard
      if (userRole === "staff") {
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

  if (!user) return <Navigate to="/login" replace />;
  if (userRole === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
  if (userRole === "affiliate") return <Navigate to="/affiliate/dashboard" replace />;
  if (userRole === "staff") return <Navigate to="/staff-dashboard" replace />;

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
