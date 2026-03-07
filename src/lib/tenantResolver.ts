/**
 * Tenant resolver: detects tenant slug from subdomain or query param.
 *
 * Priority:
 * 1. Subdomain (e.g. vcclimatizacao.usaruistemas.com.br → "vcclimatizacao")
 * 2. Query param ?tenant=slug (localhost fallback for dev)
 * 3. null → main domain, show landing/login
 */

// Known main domains where subdomains map to tenant slugs
const MAIN_DOMAINS = [
  "usaruistemas.com.br",
  "zarosistemas.com.br",
  "zarosaas.lovable.app",
];

// Domains that should never be treated as tenant subdomains
const IGNORED_HOSTS = [
  "localhost",
  "127.0.0.1",
];

// Preview domains pattern (Lovable preview URLs)
const PREVIEW_PATTERN = /\.lovable\.app$/;

export interface TenantResolution {
  slug: string | null;
  source: "subdomain" | "query" | "path" | null;
}

export function resolveTenantFromHostname(hostname: string, search: string): TenantResolution {
  // 1. Check if it's a known main domain (no subdomain)
  const lowerHost = hostname.toLowerCase();

  // Skip localhost / 127.0.0.1 — use query param fallback
  if (IGNORED_HOSTS.some((h) => lowerHost.startsWith(h))) {
    const params = new URLSearchParams(search);
    const tenantParam = params.get("tenant");
    if (tenantParam) {
      return { slug: tenantParam, source: "query" };
    }
    return { slug: null, source: null };
  }

  // 2. Check for preview domain (e.g. id-preview--xxx.lovable.app) — skip subdomain detection
  if (PREVIEW_PATTERN.test(lowerHost)) {
    const params = new URLSearchParams(search);
    const tenantParam = params.get("tenant");
    if (tenantParam) {
      return { slug: tenantParam, source: "query" };
    }
    return { slug: null, source: null };
  }

  // 3. Check if hostname is a subdomain of a known main domain
  for (const mainDomain of MAIN_DOMAINS) {
    if (lowerHost === mainDomain || lowerHost === `www.${mainDomain}`) {
      // It's the main domain itself, no tenant
      return { slug: null, source: null };
    }

    if (lowerHost.endsWith(`.${mainDomain}`)) {
      // Extract subdomain: "vcclimatizacao.usaruistemas.com.br" → "vcclimatizacao"
      const subdomain = lowerHost.replace(`.${mainDomain}`, "");
      // Ignore "www" subdomain
      if (subdomain && subdomain !== "www") {
        return { slug: subdomain, source: "subdomain" };
      }
      return { slug: null, source: null };
    }
  }

  // 4. Unknown domain — could be a custom domain mapped to a tenant
  // For now, return null (future: lookup custom domains table)
  return { slug: null, source: null };
}

/**
 * Get tenant slug from current browser context.
 * Call this once at app startup.
 */
export function detectTenantSlug(): TenantResolution {
  if (typeof window === "undefined") return { slug: null, source: null };
  return resolveTenantFromHostname(window.location.hostname, window.location.search);
}
