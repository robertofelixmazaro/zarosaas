import { useEffect } from "react";

/**
 * Dynamically updates the PWA manifest based on tenant data.
 * Creates a blob URL manifest with tenant name, logo, and theme color.
 */
export function useDynamicManifest(
  tenantName?: string,
  logoUrl?: string,
  themeColor?: string
) {
  useEffect(() => {
    if (!tenantName) return;

    const color = themeColor || "#000000";

    const manifest = {
      name: tenantName,
      short_name: tenantName.slice(0, 12),
      description: `Agende seu horário em ${tenantName}`,
      start_url: window.location.pathname,
      display: "standalone" as const,
      background_color: "#ffffff",
      theme_color: color,
      orientation: "portrait" as const,
      icons: logoUrl
        ? [
            { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" },
          ]
        : [],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Replace existing manifest link
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) {
      link.href = url;
    } else {
      link = document.createElement("link");
      link.rel = "manifest";
      link.href = url;
      document.head.appendChild(link);
    }

    // Update theme-color meta tag
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = color;
    }

    // Update apple-touch-icon if logo available
    if (logoUrl) {
      let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = logoUrl;
      } else {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = logoUrl;
        document.head.appendChild(appleIcon);
      }
    }

    return () => URL.revokeObjectURL(url);
  }, [tenantName, logoUrl, themeColor]);
}
