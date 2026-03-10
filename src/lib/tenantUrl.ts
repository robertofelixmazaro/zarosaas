/**
 * Tenant URL utilities — path-based routing (/t/:slug).
 */

/**
 * Returns the full external URL for a tenant.
 * Always uses path-based: origin + /t/:slug
 */
export function getTenantExternalUrl(slug: string): string {
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
