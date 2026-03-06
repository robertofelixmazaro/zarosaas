import { useEffect } from "react";

interface OgMetaParams {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Updates OG and Twitter meta tags client-side for SPA navigation.
 * Note: Crawlers won't see these — use the og-tenant edge function for sharing.
 */
export function useOgMetaTags({ title, description, image, url }: OgMetaParams) {
  useEffect(() => {
    if (!title) return;

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (el) {
        el.setAttribute("content", value);
      } else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        el.setAttribute("content", value);
        document.head.appendChild(el);
      }
    };

    document.title = title;

    setMeta("property", "og:title", title);
    setMeta("property", "og:type", "website");
    if (description) setMeta("property", "og:description", description);
    if (image) setMeta("property", "og:image", image);
    if (url) setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", "ZARO AGENDAMENTOS");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    if (description) setMeta("name", "twitter:description", description);
    if (image) setMeta("name", "twitter:image", image);
  }, [title, description, image, url]);
}
