import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  tenantSlug: null,
  loading: true,
  error: null,
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTenant = async () => {
      setLoading(true);
      setError(null);

      if (slug) {
        // Public route: resolve by slug
        const { data, error: err } = await supabase
          .from("tenants" as any)
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (err) {
          setError("Erro ao carregar negócio.");
        } else if (!data) {
          setError("Negócio não encontrado.");
        } else {
          setTenant(data as any);
        }
      } else if (user) {
        // Admin route without slug: resolve from user profile
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("tenant_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (profile && (profile as any).tenant_id) {
          const { data } = await supabase
            .from("tenants" as any)
            .select("*")
            .eq("id", (profile as any).tenant_id)
            .maybeSingle();
          if (data) setTenant(data as any);
        }
      }
      setLoading(false);
    };
    loadTenant();
  }, [slug, user]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || null,
        tenantSlug: tenant?.slug || slug || null,
        loading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
