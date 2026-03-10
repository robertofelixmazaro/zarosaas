/**
 * Tenant resolver: detects tenant slug from URL path or custom domain.
 *
 * Priority:
 * 1. Path-based: /t/:slug
 * 2. Custom domain lookup (resolved async in TenantContext)
 * 3. Query param ?tenant=slug (localhost fallback for dev)
 * 4. null → main domain, show landing/login
 */

// Known main domains (no tenant detection needed)
const MAIN_DOMAINS = [
  "usaruistemas.com.br",
  "zarosistemas.com.br",
  "zarosaas.lovable.app",
];

// Domains that should never be treated as tenant
const IGNORED_HOSTS = [
  "localhost",
  "127.0.0.1",
];

// Preview domains pattern (Lovable preview URLs)
const PREVIEW_PATTERN = /\.lovable\.app$/;

export interface TenantResolution {
  slug: string | null;
  source: "path" | "query" | "custom_domain" | null;
  /** When source is 'custom_domain', this holds the hostname for DB lookup */
  customDomainHost?: string;
}

/**
 * Check if the current hostname is a known main domain, preview, or localhost.
 * If it's an unknown domain, it might be a custom domain.
 */
export function detectTenantSlug(): TenantResolution {
  if (typeof window === "undefined") return { slug: null, source: null };

  const hostname = window.location.hostname.toLowerCase();
  const search = window.location.search;

  // 1. Localhost — use query param
  if (IGNORED_HOSTS.some((h) => hostname.startsWith(h))) {
    const params = new URLSearchParams(search);
    const tenantParam = params.get("tenant");
    if (tenantParam) {
      return { slug: tenantParam, source: "query" };
    }
    return { slug: null, source: null };
  }

  // 2. Preview domain — use query param
  if (PREVIEW_PATTERN.test(hostname)) {
    const params = new URLSearchParams(search);
    const tenantParam = params.get("tenant");
    if (tenantParam) {
      return { slug: tenantParam, source: "query" };
    }
    return { slug: null, source: null };
  }

  // 3. Known main domain — no tenant (landing page)
  for (const mainDomain of MAIN_DOMAINS) {
    if (hostname === mainDomain || hostname === `www.${mainDomain}`) {
      return { slug: null, source: null };
    }
  }

  // 4. Unknown domain — could be a custom domain mapped to a tenant
  return { slug: null, source: "custom_domain", customDomainHost: hostname };
}
