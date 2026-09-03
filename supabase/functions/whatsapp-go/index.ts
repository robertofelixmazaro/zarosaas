import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getInstanceStatus,
  normalizeBaseUrl,
  sendWhatsAppText,
} from "../_shared/whatsappGo.ts";

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

/** instance_name is a free-form label. No UUID, no fixed format. */
function normalizeInstanceName(raw: string): string {
  return (raw || "").trim().slice(0, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) {
    return json({ error: "Configuração do servidor incompleta." }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Authenticate from the session token only ──
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ error: "Não autorizado." }, 401);

  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "Não autorizado." }, 401);

  // ── Tenant comes from the authenticated profile, never from the browser ──
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const tenantId = (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;
  if (!tenantId) return json({ error: "Nenhuma empresa associada a esta conta." }, 403);

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

  const loadConfig = async () => {
    const { data } = await admin
      .from("whatsapp_go_configs")
      .select("base_url, instance_token, instance_name, instance_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return data as
      | { base_url: string; instance_token: string; instance_name: string | null; instance_id: string | null }
      | null;
  };

  try {
    // ── GET CONFIG (never returns the token) ──
    if (action === "get") {
      const { data } = await admin
        .from("whatsapp_go_configs")
        .select("base_url, instance_name, instance_id, updated_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      return json({
        configured: !!data,
        base_url: data?.base_url ?? "",
        instance_name: data?.instance_name ?? "",
        instance_id: data?.instance_id ?? "",
        has_token: !!data,
        updated_at: data?.updated_at ?? null,
      });
    }

    // ── SAVE CONFIG ──
    if (action === "save") {
      const baseUrl = normalizeBaseUrl(String(body.base_url ?? ""));
      const instanceName = normalizeInstanceName(String(body.instance_name ?? ""));
      const rawToken = String(body.instance_token ?? "").trim();

      if (!baseUrl) return json({ error: "URL base inválida. Use http(s)://seu-servidor" }, 400);

      const { data: existing } = await admin
        .from("whatsapp_go_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!existing && !rawToken) return json({ error: "Informe o Token da Instância." }, 400);

      if (existing) {
        const patch: Record<string, unknown> = {
          base_url: baseUrl,
          instance_name: instanceName || null,
          updated_at: new Date().toISOString(),
        };
        if (rawToken) patch.instance_token = rawToken; // blank keeps the stored token
        const { error } = await admin
          .from("whatsapp_go_configs")
          .update(patch)
          .eq("tenant_id", tenantId);
        if (error) return json({ error: "Não foi possível salvar a configuração." }, 500);
      } else {
        const { error } = await admin.from("whatsapp_go_configs").insert({
          tenant_id: tenantId,
          base_url: baseUrl,
          instance_token: rawToken,
          instance_name: instanceName || null,
        });
        if (error) return json({ error: "Não foi possível salvar a configuração." }, 500);
      }

      return json({ saved: true, base_url: baseUrl, instance_name: instanceName, has_token: true });
    }

    // ── VERIFY CONNECTION (real call: GET /instance/status) ──
    if (action === "verify") {
      const cfg = await loadConfig();
      if (!cfg) return json({ status: "disconnected", message: "Nenhuma configuração salva." });
      const result = await getInstanceStatus(cfg);
      return json({ ...result, endpoint: "GET /instance/status" });
    }

    // ── SEND TEXT (same function the reminders will call) ──
    if (action === "send") {
      const cfg = await loadConfig();
      if (!cfg) return json({ error: "Configure a Evolution Go antes de enviar mensagens." }, 400);

      const result = await sendWhatsAppText(
        cfg,
        String(body.number ?? ""),
        String(body.text ?? ""),
      );
      return json(
        { sent: result.ok, message: result.message, http_status: result.status, data: result.data },
        result.ok ? 200 : 400,
      );
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (_e) {
    // Never log credentials or raw provider bodies.
    return json({ error: "Erro inesperado ao processar a solicitação." }, 500);
  }
});
