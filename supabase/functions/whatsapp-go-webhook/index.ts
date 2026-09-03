import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Webhook receiver for What's Evolution Go.
 * Payload shape: { event, instanceId, instanceName, instanceToken, data: { Info, Message } }
 * The tenant is resolved ONLY by matching `instanceToken` against the stored per-tenant token.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Strips @s.whatsapp.net / @lid suffixes and keeps digits only. */
function toDigits(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const base = value.split("@")[0].split(":")[0];
  const digits = base.replace(/\D+/g, "");
  return digits || null;
}

function extractText(message: any): string | null {
  const text = message?.extendedTextMessage?.text ?? message?.conversation ?? null;
  return typeof text === "string" && text.trim() ? text : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) return json({ error: "Servidor indisponível." }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const instanceToken =
    (typeof payload?.instanceToken === "string" && payload.instanceToken.trim()) ||
    (req.headers.get("apikey") || "").trim();

  if (!instanceToken) return json({ error: "Instância não identificada." }, 401);

  const { data: cfg } = await admin
    .from("whatsapp_go_configs")
    .select("tenant_id")
    .eq("instance_token", instanceToken)
    .maybeSingle();

  const tenantId = (cfg as { tenant_id: string } | null)?.tenant_id;
  if (!tenantId) return json({ error: "Instância não reconhecida." }, 401);

  const info = payload?.data?.Info ?? {};
  const message = payload?.data?.Message ?? {};

  // Prefer the real phone number fields over internal @lid ids.
  const isFromMe = Boolean(info?.IsFromMe);
  const preferred = isFromMe ? info?.RecipientAlt : info?.SenderAlt;
  const fallback = isFromMe ? info?.Chat : info?.Sender;
  const fromNumber = toDigits(preferred) ?? (String(fallback ?? "").includes("@lid") ? null : toDigits(fallback));

  const { error } = await admin.from("whatsapp_go_events").insert({
    tenant_id: tenantId,
    event: String(payload?.event ?? "unknown"),
    instance_name: typeof payload?.instanceName === "string" ? payload.instanceName : null,
    instance_id: typeof payload?.instanceId === "string" ? payload.instanceId : null,
    chat: typeof info?.Chat === "string" ? info.Chat : null,
    message_id: typeof info?.ID === "string" ? info.ID : null,
    from_number: fromNumber,
    push_name: typeof info?.PushName === "string" ? info.PushName : null,
    message_text: extractText(message),
    is_from_me: isFromMe,
    is_group: Boolean(info?.IsGroup),
    message_type: typeof info?.Type === "string" ? info.Type : null,
    raw: payload,
  });

  if (error) return json({ error: "Não foi possível registrar o evento." }, 500);

  return json({ received: true });
});
