/**
 * Automatic WhatsApp messages — shared logic.
 * Uses the EXISTING Evolution Go send service (`sendWhatsAppText`).
 * Never logs or returns tokens.
 */
import { sendWhatsAppText, type WhatsAppGoConfig } from "./whatsappGo.ts";

export type AutoMessageType =
  | "booking_confirmation_client"
  | "booking_confirmation_owner"
  | "reminder_1_day"
  | "reminder_2_hours";

export interface AutoSettings {
  tenant_id: string;
  timezone: string;
  confirm_client_enabled: boolean;
  confirm_client_template: string;
  confirm_owner_enabled: boolean;
  confirm_owner_template: string;
  owner_phone: string | null;
  reminder_1d_enabled: boolean;
  reminder_1d_time: string;
  reminder_1d_template: string;
  reminder_2h_enabled: boolean;
  reminder_2h_template: string;
}

export const TEMPLATE_VARS = [
  "cliente",
  "telefone",
  "servico",
  "data",
  "horario",
  "empresa",
  "profissional",
  "endereco",
] as const;

export function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template || "";
  for (const key of TEMPLATE_VARS) {
    const value = vars[key] ?? "";
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
    out = out.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), value);
  }
  return out;
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = (isoDate || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : isoDate || "";
}

export function formatTimeHM(t: string): string {
  return (t || "").slice(0, 5);
}

/** Current wall-clock time in the tenant timezone, as {date:"YYYY-MM-DD", minutes:number}. */
export function nowInTimezone(timeZone: string): { date: string; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(hour) * 60 + Number(get("minute")),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Digits + DDI only, matching what Evolution Go expects. */
export function sanitizePhone(raw: string | null | undefined): string | null {
  let digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export interface AppointmentRow {
  id: string;
  tenant_id: string;
  client_name: string;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  services?: { name?: string | null } | null;
  barbers?: { name?: string | null } | null;
}

export function buildVars(
  appt: AppointmentRow,
  tenant: { name?: string | null; address?: string | null } | null,
): Record<string, string> {
  return {
    cliente: appt.client_name || "",
    telefone: appt.client_phone || "",
    servico: appt.services?.name || "",
    data: formatDateBR(appt.appointment_date),
    horario: formatTimeHM(appt.appointment_time),
    empresa: tenant?.name || "",
    profissional: appt.barbers?.name || "",
    endereco: tenant?.address || "",
  };
}

/**
 * Idempotent send: claims the (appointment_id, message_type) slot in
 * whatsapp_auto_logs before touching the provider. A duplicate claim means the
 * message already went out (or is going out) — nothing is sent twice.
 */
export async function sendAutoMessage(
  admin: any,
  params: {
    tenantId: string;
    appointmentId: string;
    type: AutoMessageType;
    phone: string | null | undefined;
    text: string;
    scheduledFor?: string | null;
    config: WhatsAppGoConfig | null;
  },
): Promise<{ skipped?: string; sent?: boolean; error?: string }> {
  const { tenantId, appointmentId, type, text, scheduledFor, config } = params;

  const { error: claimErr } = await admin.from("whatsapp_auto_logs").insert({
    tenant_id: tenantId,
    appointment_id: appointmentId,
    message_type: type,
    recipient: null,
    scheduled_for: scheduledFor ?? new Date().toISOString(),
    status: "processing",
  });

  if (claimErr) {
    // Unique violation = already handled by a previous run.
    return { skipped: "duplicate" };
  }

  const finish = async (patch: Record<string, unknown>) => {
    await admin
      .from("whatsapp_auto_logs")
      .update(patch)
      .eq("appointment_id", appointmentId)
      .eq("message_type", type);
  };

  const number = sanitizePhone(params.phone);
  if (!number) {
    await finish({ status: "skipped", error_message: "Telefone ausente ou inválido." });
    return { skipped: "invalid_phone" };
  }
  if (!config) {
    await finish({ status: "skipped", recipient: number, error_message: "WhatsApp não configurado para esta empresa." });
    return { skipped: "not_configured" };
  }
  if (!text.trim()) {
    await finish({ status: "skipped", recipient: number, error_message: "Mensagem vazia." });
    return { skipped: "empty_message" };
  }

  const result = await sendWhatsAppText(config, number, text);

  if (result.ok) {
    const messageId =
      (result.data as any)?.Id ?? (result.data as any)?.id ?? (result.data as any)?.key?.id ?? null;
    await finish({
      status: "sent",
      recipient: number,
      sent_at: new Date().toISOString(),
      provider_message_id: messageId ? String(messageId).slice(0, 200) : null,
      error_message: null,
    });
    return { sent: true };
  }

  await finish({
    status: "failed",
    recipient: number,
    error_message: result.message.slice(0, 500),
  });
  return { error: result.message };
}
