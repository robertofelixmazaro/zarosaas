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
  custom_domain?: string | null;
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

// Detect once at module level
const detection = detectTenantSlug();

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const { user, userRole, roleLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effective slug: route param > query param detection
  const effectiveSlug = routeSlug || detection.slug;
  const isCustomDomain = !routeSlug && !detection.slug && detection.source === "custom_domain";

  useEffect(() => {
    if (roleLoading) return;

    const loadTenant = async () => {
      setLoading(true);
      setError(null);

      // 1. Resolve by slug (from URL path or query param)
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
      }
      // 2. Custom domain lookup (uses security definer function to bypass RLS)
      else if (isCustomDomain && detection.customDomainHost) {
        const { data, error: err } = await (supabase.rpc as any)("get_public_tenant_by_custom_domain", { _domain: detection.customDomainHost });
        const row = Array.isArray(data) ? data[0] : data;
        if (err) {
          setError("Erro ao carregar negócio.");
        } else if (!row) {
          setError("Empresa não encontrada para este domínio.");
        } else {
          setTenant({
            id: row.id,
            name: row.name,
            slug: row.slug,
            logo_url: row.logo_url,
            active: row.active,
            niche: row.niche || null,
            custom_domain: detection.customDomainHost,
            owner_user_id: null,
            phone: null,
            address: null,
            created_at: "",
          });
        }
      }
      // 3. Super admins without slug don't need a tenant
      else if (userRole === "super_admin") {
        setTenant(null);
      }
      // 4. Admin route without slug: resolve from user profile
      else if (user) {
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("tenant_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (profile && (profile as any).tenant_id) {
          const { data } = await supabase
            .from("tenants" as any)
            .select(TENANT_SAFE_COLUMNS)
            .eq("id", (profile as any).tenant_id)
            .maybeSingle();
          if (data) setTenant(data as any);
        }
      }
      setLoading(false);
    };
    loadTenant();
  }, [effectiveSlug, isCustomDomain, user, userRole, roleLoading]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id || null,
        tenantSlug: tenant?.slug || effectiveSlug || null,
        loading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
