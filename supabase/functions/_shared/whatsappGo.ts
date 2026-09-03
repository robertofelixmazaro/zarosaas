/**
 * What's Evolution Go — shared send service.
 * Contract: POST {BASE_URL}/send/text  |  header `apikey: <instance token>`
 * Body: { "number": "5511999999999", "text": "..." }
 * The instance is implicit in the token — never in the URL, never in the body.
 */

export interface WhatsAppGoConfig {
  base_url: string;
  instance_token: string;
  instance_name?: string | null;
}

export interface SendResult {
  ok: boolean;
  status: number;
  message: string;
  data?: unknown;
}

/** Trims and validates the base URL. Never logged. */
export function normalizeBaseUrl(raw: string): string | null {
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

/** Digits only, with country code. Adds 55 when a plain Brazilian number is given. */
export function normalizeNumber(raw: string): string | null {
  let digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts a friendly error message from an Evolution Go JSON error body. */
function apiErrorMessage(parsed: any, status: number): string {
  const fromApi =
    parsed?.error?.message ??
    parsed?.message ??
    (typeof parsed?.error === "string" ? parsed.error : null);
  if (fromApi && String(fromApi).length < 300) return String(fromApi);

  switch (status) {
    case 400:
      return "Requisição inválida (verifique o número e o texto).";
    case 401:
      return "Token da instância inválido ou ausente.";
    case 403:
      return "Token sem permissão para esta operação.";
    case 404:
      return "Recurso não encontrado na Evolution Go (verifique a URL base).";
    case 409:
      return "Conflito na Evolution Go (instância em estado incompatível).";
    case 429:
      return "Limite de requisições excedido. Tente novamente em instantes.";
    case 500:
      return "Erro interno da Evolution Go.";
    default:
      return `Evolution Go respondeu com erro HTTP ${status}.`;
  }
}

/**
 * The single real send function. Reminders and the test button both use this.
 */
export async function sendWhatsAppText(
  config: WhatsAppGoConfig,
  number: string,
  text: string,
): Promise<SendResult> {
  const baseUrl = normalizeBaseUrl(config.base_url);
  if (!baseUrl) return { ok: false, status: 0, message: "URL base da Evolution Go inválida." };

  const to = normalizeNumber(number);
  if (!to) return { ok: false, status: 0, message: "Número inválido. Use apenas dígitos com DDI, ex.: 5511999999999." };

  const body = (text || "").trim();
  if (!body) return { ok: false, status: 0, message: "A mensagem não pode estar vazia." };

  let res: Response;
  try {
    res = await fetchWithTimeout(`${baseUrl}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.instance_token },
      body: JSON.stringify({ number: to, text: body }),
    });
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      message: aborted
        ? "Tempo de resposta esgotado ao contatar a Evolution Go."
        : "Não foi possível alcançar a Evolution Go (erro de rede ou host inválido).",
    };
  }

  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, message: apiErrorMessage(parsed, res.status) };
  }

  return { ok: true, status: res.status, message: "Mensagem enviada.", data: parsed?.data ?? parsed };
}

export type InstanceStatus =
  | "connected"
  | "disconnected"
  | "logged_out"
  | "auth_error"
  | "not_found"
  | "api_unavailable";

/**
 * GET {BASE_URL}/instance/status with header `apikey` (documented Evolution Go endpoint).
 * Response: { data: { Connected: bool, LoggedIn: bool, Name: string } }
 */
export async function getInstanceStatus(config: WhatsAppGoConfig): Promise<{
  status: InstanceStatus;
  message: string;
  connected?: boolean;
  logged_in?: boolean;
  name?: string | null;
}> {
  const baseUrl = normalizeBaseUrl(config.base_url);
  if (!baseUrl) return { status: "api_unavailable", message: "URL base da Evolution Go inválida." };

  let res: Response;
  try {
    res = await fetchWithTimeout(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: { apikey: config.instance_token, "Content-Type": "application/json" },
    });
  } catch (e) {
    const aborted = (e as Error)?.name === "AbortError";
    return {
      status: "api_unavailable",
      message: aborted
        ? "Tempo de resposta esgotado ao consultar a Evolution Go."
        : "Não foi possível alcançar a Evolution Go (erro de rede ou host inválido).",
    };
  }

  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (res.status === 401 || res.status === 403) {
    return { status: "auth_error", message: apiErrorMessage(parsed, res.status) };
  }
  if (res.status === 404) {
    return { status: "not_found", message: apiErrorMessage(parsed, res.status) };
  }
  if (!res.ok) {
    return { status: "api_unavailable", message: apiErrorMessage(parsed, res.status) };
  }

  const data = parsed?.data ?? parsed ?? {};
  const connected = Boolean(data.Connected ?? data.connected);
  const loggedIn = Boolean(data.LoggedIn ?? data.logged_in);
  const name = (data.Name ?? data.name ?? null) as string | null;

  let status: InstanceStatus;
  if (connected && loggedIn) status = "connected";
  else if (connected && !loggedIn) status = "logged_out";
  else status = "disconnected";

  return {
    status,
    message:
      status === "connected"
        ? "Instância conectada e autenticada no WhatsApp."
        : status === "logged_out"
          ? "Instância online, mas sem sessão do WhatsApp (leia o QR Code na Evolution Go)."
          : "Instância desconectada.",
    connected,
    logged_in: loggedIn,
    name,
  };
}
