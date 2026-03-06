import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectTenantSlug } from "@/lib/tenantResolver";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  active?: boolean;
  niche?: string | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
  /** Whether tenant was resolved from subdomain */
  isSubdomain: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  tenantSlug: null,
  loading: true,
  error: null,
  isSubdomain: false,
});

// Detect once at module level so it's stable across renders
const subdomainResolution = detectTenantSlug();

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const { user, userRole, roleLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effective slug: route param > subdomain/query detection
  const effectiveSlug = routeSlug || subdomainResolution.slug;
  const isSubdomain = !routeSlug && subdomainResolution.source === "subdomain";

  useEffect(() => {
    // Wait for role to load before deciding
    if (roleLoading) return;

    const loadTenant = async () => {
      setLoading(true);
      setError(null);

      // Public route with slug (from URL param or subdomain): resolve by slug
      if (effectiveSlug) {
        const { data, error: err } = await (supabase.rpc as any)("get_public_tenant_by_slug", { _slug: effectiveSlug });
        const row = Array.isArray(data) ? data[0] : data;
        if (err) {
          setError("Erro ao carregar negócio.");
        } else if (!row) {
          setError("Empresa não encontrada.");
        } else {
          setTenant({
            id: row.id,
            name: row.name,
            slug: row.slug,
            logo_url: row.logo_url,
            active: row.active,
            niche: row.niche || null,
            owner_user_id: null,
            phone: null,
            address: null,
            created_at: "",
          });
        }
      } else if (userRole === "super_admin") {
        // Super admins without slug don't need a tenant
        setTenant(null);
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
  }, [effectiveSlug, user, userRole, roleLoading]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || null,
        tenantSlug: tenant?.slug || effectiveSlug || null,
        loading,
        error,
        isSubdomain,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
