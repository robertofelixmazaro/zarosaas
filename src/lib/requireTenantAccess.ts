import { supabase } from "@/integrations/supabase/client";

/**
 * Verifies the authenticated user belongs to the given tenant.
 * Returns the verified tenant_id or throws an error.
 */
export async function requireTenantAccess(tenantId: string): Promise<string> {
  if (!tenantId) {
    throw new Error("Tenant não identificado.");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile || profile.tenant_id !== tenantId) {
    throw new Error("Acesso negado: você não pertence a este negócio.");
  }

  return tenantId;
}

/**
 * Gets the current user's tenant_id from their profile.
 * Returns null if not authenticated or no tenant assigned.
 */
export async function getCurrentUserTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  return profile?.tenant_id || null;
}
