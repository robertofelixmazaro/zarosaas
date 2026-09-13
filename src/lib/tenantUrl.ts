/**
 * Tenant URL utilities — path-based routing (/t/:slug).
 */

/**
 * Returns the full external URL for a tenant.
 * Prioritizes custom domain if available, otherwise uses path-based /t/:slug.
 */
export function getTenantExternalUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) {
    // Ensure protocol is included
    const domain = customDomain.startsWith("http") ? customDomain : `https://${customDomain}`;
    return domain;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/t/${slug}`;
}

/**
 * Returns the base path for internal navigation within a tenant context.
 * Always returns "/t/:slug"
 */
export function getTenantBasePath(slug: string | null): string {
  if (!slug) return "";
  return `/t/${slug}`;
}

/**
 * Returns the admin URL for a tenant.
 */
export function getTenantAdminUrl(slug: string): string {
  return `/t/${slug}/admin`;
}

/**
 * Colunas da empresa que podem ser lidas pelo aplicativo.
 * Credenciais de pagamento ficam fora desta lista por segurança.
 */
export const TENANT_SAFE_COLUMNS =
  "id, name, slug, owner_user_id, logo_url, phone, address, created_at, active, plan_id, niche, no_show_enabled, no_show_deposit_value, no_show_retention_percentage, no_show_cancel_limit_hours, referred_by_affiliate_id, onboarding_completed, marketplace_visible, city, custom_domain, marketplace_logo_url";
