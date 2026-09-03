import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Normalizes the base URL: trims spaces and trailing slashes. Never logged. */
function normalizeApiUrl(raw: string): string | null {
  const value = (raw || "").trim().replace(/\/+$/, "");
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return value;
}

/**
 * instance_name is a free-form STRING provided by the Evolution API.
 * No UUID assumption, no fixed instance, no provider-specific regex.
 * We only reject values that are empty, too long, or that would break the URL path.
 */
function normalizeInstanceName(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (value.length > 200) return null;
  if (/[\s/\\?#]/.test(value)) return null;
  return value;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type StatusCode =
  | "connected"
  | "connecting"
  | "disconnected"
  | "auth_error"
  | "instance_not_found"
  | "api_unavailable";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) {
    return json({ error: "Configuração do servidor incompleta." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── 1. Authenticate the caller from the session token (never trust the body) ──
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ error: "Não autorizado." }, 401);

  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "Não autorizado." }, 401);

  // ── 2. Resolve the tenant from the authenticated session only ──
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const tenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
  if (!tenantId) return json({ error: "Nenhuma empresa associada a esta conta." }, 403);

  // ── 3. Only the admin of that tenant may manage the integration ──
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) return json({ error: "Acesso restrito ao administrador da empresa." }, 403);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const action = String(body.action || "get");

  try {
    // ── GET CONFIG (never returns the api_key) ──
    if (action === "get") {
      const { data } = await admin
        .from("whatsapp_evolution_configs")
        .select("api_url, instance_name, updated_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      return json({
        configured: !!data,
        api_url: data?.api_url ?? "",
        instance_name: data?.instance_name ?? "",
        has_api_key: !!data,
        updated_at: data?.updated_at ?? null,
      });
    }

    // ── SAVE CONFIG ──
    if (action === "save") {
      const apiUrl = normalizeApiUrl(String(body.api_url ?? ""));
      const instanceName = normalizeInstanceName(String(body.instance_name ?? ""));
      const rawKey = String(body.api_key ?? "").trim();

      if (!apiUrl) return json({ error: "URL base inválida. Use http(s)://seu-servidor" }, 400);
      if (!instanceName) {
        return json(
          { error: "Nome da instância inválido. Não pode ser vazio nem conter espaços ou / \\ ? #" },
          400
        );
      }

      const { data: existing } = await admin
        .from("whatsapp_evolution_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!existing && !rawKey) return json({ error: "Informe a API Key." }, 400);

      if (existing) {
        const patch: Record<string, unknown> = {
          api_url: apiUrl,
          instance_name: instanceName,
          updated_at: new Date().toISOString(),
        };
        // Empty api_key on update = keep the stored one
        if (rawKey) patch.api_key = rawKey;
        const { error } = await admin
          .from("whatsapp_evolution_configs")
          .update(patch)
          .eq("tenant_id", tenantId);
        if (error) return json({ error: "Não foi possível salvar a configuração." }, 500);
      } else {
        const { error } = await admin.from("whatsapp_evolution_configs").insert({
          tenant_id: tenantId,
          api_url: apiUrl,
          api_key: rawKey,
          instance_name: instanceName,
        });
        if (error) return json({ error: "Não foi possível salvar a configuração." }, 500);
      }

      return json({ saved: true, api_url: apiUrl, instance_name: instanceName, has_api_key: true });
    }

    // ── VERIFY CONNECTION (real call to the Evolution API) ──
    if (action === "verify") {
      const { data: cfg } = await admin
        .from("whatsapp_evolution_configs")
        .select("api_url, api_key, instance_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!cfg) return json({ status: "disconnected", message: "Nenhuma configuração salva." }, 200);

      const apiUrl = normalizeApiUrl(cfg.api_url);
      const instanceName = normalizeInstanceName(cfg.instance_name);
      if (!apiUrl || !instanceName) {
        return json({ status: "api_unavailable", message: "Configuração salva é inválida." }, 200);
      }

      // Evolution API (v1 and v2): GET /instance/connectionState/{instance} with the `apikey` header
      const endpoint = `${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;

      let res: Response;
      try {
        res = await fetchWithTimeout(endpoint, {
          method: "GET",
          headers: { apikey: cfg.api_key, "Content-Type": "application/json" },
        });
      } catch {
        return json({
          status: "api_unavailable" satisfies StatusCode,
          message: "Não foi possível alcançar a Evolution API (timeout ou host inválido).",
          endpoint: `/instance/connectionState/${instanceName}`,
        });
      }

      const raw = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (res.status === 401 || res.status === 403) {
        return json({ status: "auth_error" satisfies StatusCode, message: "API Key inválida ou sem permissão." });
      }
      if (res.status === 404) {
        return json({
          status: "instance_not_found" satisfies StatusCode,
          message: `Instância "${instanceName}" não encontrada na Evolution API.`,
        });
      }
      if (!res.ok) {
        return json({
          status: "api_unavailable" satisfies StatusCode,
          message: `Evolution API respondeu com erro HTTP ${res.status}.`,
        });
      }

      // v2: { instance: { instanceName, state } } | v1: { state } | { instance: { state } }
      const state = String(
        parsed?.instance?.state ?? parsed?.state ?? parsed?.instance?.connectionStatus ?? ""
      ).toLowerCase();

      let status: StatusCode;
      if (state === "open") status = "connected";
      else if (state === "connecting") status = "connecting";
      else if (state === "close" || state === "closed") status = "disconnected";
      else status = "api_unavailable";

      return json({
        status,
        state,
        instance_name: instanceName,
        endpoint: `/instance/connectionState/${instanceName}`,
      });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (_e) {
    // Never log credentials or response bodies that may carry them.
    return json({ error: "Erro inesperado ao processar a solicitação." }, 500);
  }
});
