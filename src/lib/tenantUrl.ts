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
