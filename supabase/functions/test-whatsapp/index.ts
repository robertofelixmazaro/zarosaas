import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Evolution API instance names are free-form strings chosen by the provider.
 * We only reject values that could break the URL path — no format/pattern rule,
 * no UUID requirement, no hardcoded instance.
 */
function normalizeInstance(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Nome da instância inválido." };
  const value = raw.trim();
  if (!value) return { ok: false, error: "Informe o ID/nome da instância." };
  if (value.length > 200) return { ok: false, error: "Nome da instância muito longo." };
  if (/[\s/\\?#]/.test(value)) {
    return { ok: false, error: "O nome da instância não pode conter espaços ou os caracteres / \\ ? #." };
  }
  return { ok: true, value };
}

function normalizeApiUrl(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Informe a URL da API." };
  const value = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
  } catch {
    return { ok: false, error: "URL da API inválida." };
  }
  return { ok: true, value };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function httpErrorMessage(status: number): string {
  if (status === 401 || status === 403) return "Token/API Key inválido ou sem permissão para esta instância.";
  if (status === 404) return "Instância não encontrada nesta API. Verifique o nome da instância.";
  if (status >= 500) return "A API do WhatsApp está indisponível no momento (erro no servidor).";
  return "Erro ao comunicar com a API do WhatsApp.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Sessão inválida" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!isAdmin && !isSuperAdmin) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action, phone, message } = body ?? {};

    // ---- Multi-tenant resolution -------------------------------------------
    // The tenant is ALWAYS derived from the authenticated caller's profile.
    // A tenant can never read or use another tenant's credentials/instance.
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    let tenantId: string | null = profile?.tenant_id ?? null;
    if (isSuperAdmin && typeof body?.tenant_id === "string" && body.tenant_id) {
      tenantId = body.tenant_id; // super admin may inspect a specific tenant
    }
    if (!tenantId) return json({ error: "Nenhum negócio associado a este usuário." }, 400);

    const { data: rows } = await supabase
      .from("site_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["wa_api_url", "wa_api_key", "wa_instance_id"]);

    const stored: Record<string, string> = {};
    (rows || []).forEach((r: any) => { stored[r.key] = r.value; });

    // Unsaved values typed in the admin screen may be passed as overrides,
    // but they are only ever applied to the caller's own tenant.
    const apiUrlRes = normalizeApiUrl(body?.api_url ?? stored.wa_api_url);
    if (!apiUrlRes.ok) return json({ success: false, error: apiUrlRes.error }, 200);
    const baseUrl = apiUrlRes.value;

    const apiKey = (typeof body?.api_key === "string" && body.api_key.trim())
      ? body.api_key.trim()
      : (stored.wa_api_key || "").trim();
    if (!apiKey) return json({ success: false, error: "Informe a API Key / Token." }, 200);

    const instRes = normalizeInstance(body?.instance_id ?? stored.wa_instance_id);
    if (!instRes.ok) return json({ success: false, error: instRes.error }, 200);
    const instanceName = instRes.value;
    const instancePath = encodeURIComponent(instanceName);

    // ---- Actions ------------------------------------------------------------
    if (action === "check_connection") {
      let res: Response;
      try {
        res = await fetchWithTimeout(`${baseUrl}/instance/connectionState/${instancePath}`, {
          headers: { apikey: apiKey },
        });
      } catch (e: any) {
        return json({
          success: false,
          error: e?.name === "AbortError"
            ? "Tempo esgotado ao contatar a API do WhatsApp."
            : "Não foi possível contatar a API do WhatsApp.",
        });
      }

      const responseText = await res.text();
      let responseData: any = null;
      try { responseData = JSON.parse(responseText); } catch { /* ignore */ }

      if (!res.ok) {
        return json({
          success: false,
          error: httpErrorMessage(res.status),
          status_code: res.status,
          instance: instanceName,
          api_response: responseText.slice(0, 300),
        });
      }

      const rawState = String(
        responseData?.instance?.state ?? responseData?.state ?? responseData?.status ?? ""
      ).toLowerCase();

      const connected = rawState === "open" || rawState === "connected";
      const connecting = rawState === "connecting" || rawState === "qrcode" || rawState === "pairing";

      return json({
        success: true,
        connected,
        connecting,
        state: rawState || "desconhecido",
        instance: instanceName,
        message: connected
          ? `Instância "${instanceName}" conectada e pronta para enviar mensagens!`
          : connecting
          ? `Instância "${instanceName}" está conectando. Escaneie o QR Code para concluir.`
          : rawState === "close" || rawState === "closed" || rawState === "disconnected"
          ? `Instância "${instanceName}" desconectada. Escaneie o QR Code novamente.`
          : `A API respondeu, mas o estado é: ${rawState || "desconhecido"}.`,
      });
    }

    if (action === "send_test") {
      if (!phone) return json({ error: "Número de telefone é obrigatório" }, 400);

      let digits = String(phone).replace(/\D/g, "");
      if (!digits) return json({ error: "Número de telefone inválido" }, 400);
      if (!digits.startsWith("55")) digits = "55" + digits;
      if (digits.length < 12 || digits.length > 13) {
        return json({ error: `Número inválido (${digits.length} dígitos). Formato esperado: 5516999999999` }, 400);
      }

      const testMsg = (typeof message === "string" && message.trim())
        ? message
        : "✅ Mensagem de teste do seu sistema de agendamentos. Se você recebeu, a integração está funcionando!";

      let res: Response;
      try {
        res = await fetchWithTimeout(`${baseUrl}/message/sendText/${instancePath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify({ number: digits, text: testMsg }),
        });
      } catch (e: any) {
        return json({
          success: false,
          error: e?.name === "AbortError"
            ? "Tempo esgotado ao enviar a mensagem."
            : "Não foi possível contatar a API do WhatsApp.",
        });
      }

      const responseText = await res.text();

      if (!res.ok) {
        const errorMsg = res.status === 400
          ? "Instância não conectada ou número inválido."
          : httpErrorMessage(res.status);
        return json({
          success: false,
          error: errorMsg,
          status_code: res.status,
          instance: instanceName,
          api_response: responseText.slice(0, 300),
        });
      }

      return json({
        success: true,
        instance: instanceName,
        message: `Mensagem enviada com sucesso para ${digits} usando a instância "${instanceName}"!`,
        api_response: responseText.slice(0, 300),
      });
    }

    return json({ error: "Ação inválida. Use 'check_connection' ou 'send_test'." }, 400);
  } catch (error: any) {
    console.error("test-whatsapp error:", error);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
