import { detectTenantSlug } from "@/lib/tenantResolver";

/**
 * Main domains where subdomains map to tenant slugs.
 * Must match tenantResolver.ts MAIN_DOMAINS.
 */
const PRODUCTION_DOMAIN = "zarosistemas.com.br";

const subdomainDetection = detectTenantSlug();

/**
 * Returns the full external URL for a tenant (subdomain-based).
 * e.g. "https://minha-loja.zarosistemas.com.br"
 *
 * In dev/preview environments, falls back to current origin + /t/:slug
 */
export function getTenantExternalUrl(slug: string): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  
  // In production (on main domain or subdomain of it), use subdomain URL
  if (host.endsWith(PRODUCTION_DOMAIN) || host === PRODUCTION_DOMAIN) {
    return `https://${slug}.${PRODUCTION_DOMAIN}`;
  }

  // Dev/preview fallback: use current origin with path
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/t/${slug}`;
}

/**
 * Returns the base path for internal navigation within a tenant context.
 * - On subdomain access: returns "" (routes are at root)
 * - On path-based access: returns "/t/:slug"
 * - No tenant: returns ""
 */
export function getTenantBasePath(slug: string | null): string {
  if (!slug) return "";
  
  // If we're already on a subdomain, routes are at root
  if (subdomainDetection.source === "subdomain") {
    return "";
  }
  
  return `/t/${slug}`;
}

/**
 * Returns the admin URL for a tenant.
 * On production, redirects to subdomain + /admin
 */
export function getTenantAdminUrl(slug: string): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  
  if (host.endsWith(PRODUCTION_DOMAIN) || host === PRODUCTION_DOMAIN) {
    return `https://${slug}.${PRODUCTION_DOMAIN}/admin`;
  }

  return `/t/${slug}/admin`;
}
