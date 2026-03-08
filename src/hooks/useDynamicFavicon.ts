import { useEffect } from "react";

const DEFAULT_FAVICON = "/zaro-favicon.png";

/**
 * Dynamically updates the browser tab favicon.
 * Uses tenant logo when available, falls back to ZARO platform favicon.
 */
export function useDynamicFavicon(tenantLogoUrl?: string | null) {
  useEffect(() => {
    const href = tenantLogoUrl || DEFAULT_FAVICON;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = href;
    } else {
      link = document.createElement("link");
      link.rel = "icon";
      link.href = href;
      document.head.appendChild(link);
    }

    // Also update shortcut icon for older browsers
    let shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
    if (shortcut) {
      shortcut.href = href;
    }
  }, [tenantLogoUrl]);
}
