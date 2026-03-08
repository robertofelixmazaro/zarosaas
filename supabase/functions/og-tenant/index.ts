import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch tenant data
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, logo_url, niche")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!tenant) {
    return new Response("Tenant not found", { status: 404, headers: corsHeaders });
  }

  // Fetch site_settings for description
  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("tenant_id", tenant.id);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  const title = settingsMap.shop_name || tenant.name;
  const description = settingsMap.description || `Agende seu horário em ${tenant.name} de forma rápida e fácil.`;
  const coverImage = settingsMap.cover_image_url || "";
  const logoImage = settingsMap.logo_url || tenant.logo_url || "";
  // Prefer cover image for OG (larger, better preview), fallback to logo
  const image = coverImage || logoImage;

  // Build redirect URL — prefer subdomain if on zarosistemas.com.br
  const origin = url.searchParams.get("origin");
  const siteUrl = origin || `https://zarosaas.lovable.app/t/${tenant.slug}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(siteUrl)}">
  <meta property="og:site_name" content="ZARO AGENDAMENTOS">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <meta http-equiv="refresh" content="0;url=${escapeHtml(siteUrl)}">
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(siteUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace("${siteUrl}");</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
