import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderResult {
  type: string;
  sent: number;
  skipped: number;
}

interface TenantChannelSettings {
  reminder_email_enabled: boolean;
  reminder_whatsapp_enabled: boolean;
  reminder_push_enabled: boolean;
  reminder_sms_enabled: boolean;
}

async function getTenantChannelSettings(supabase: any, tenantId: string): Promise<TenantChannelSettings> {
  const defaults: TenantChannelSettings = {
    reminder_email_enabled: true,
    reminder_whatsapp_enabled: true,
    reminder_push_enabled: true,
    reminder_sms_enabled: false,
  };

  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .in("key", Object.keys(defaults));

  if (!data || data.length === 0) return defaults;

  const map: Record<string, boolean> = {};
  (data as any[]).forEach((r: any) => { map[r.key] = r.value === "true"; });

  return { ...defaults, ...map } as TenantChannelSettings;
}

async function getCustomTemplate(supabase: any, tenantId: string, type: string): Promise<{ subject: string; body: string } | null> {
  try {
    const { data } = await supabase
      .from("message_templates")
      .select("subject, body")
      .eq("tenant_id", tenantId)
      .eq("type", type)
      .maybeSingle();
    return data || null;
  } catch { return null; }
}

function replaceTemplateVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function templateTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

async function sendReminderEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Zaro Agendamentos <noreply@zarosistemas.com.br>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildReminderHtml(data: {
  clientName: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  date: string;
  time: string;
  reminderType: string;
}) {
  const timeLabel = data.reminderType === "24h" ? "amanhã" : "em breve";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #2563eb;">
        <h1 style="color: #1e293b; margin: 0; font-size: 24px;">⏰ Lembrete de Agendamento</h1>
        <p style="color: #64748b; margin: 8px 0 0;">${data.businessName}</p>
      </div>
      <div style="padding: 24px 0;">
        <p style="color: #334155; font-size: 16px;">Olá <strong>${data.clientName}</strong>,</p>
        <p style="color: #334155; font-size: 16px;">Este é um lembrete de que seu agendamento é <strong>${timeLabel}</strong>!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
          <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Serviço</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.serviceName}</td></tr>
          <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Profissional</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.staffName}</td></tr>
          <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Data</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.date}</td></tr>
          <tr><td style="padding: 12px 16px; color: #64748b;">Horário</td><td style="padding: 12px 16px; font-weight: bold; color: #1e293b;">${data.time}</td></tr>
        </table>
        <p style="color: #334155; font-size: 16px;">Nos vemos lá! 😄</p>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">${data.businessName} — Zaro Agendamentos</p>
      </div>
    </div>
  `;
}

async function logEmail(supabase: any, data: {
  appointment_id?: string;
  recipient_email: string;
  recipient_name?: string;
  email_type: string;
  subject: string;
  status: string;
  error_message?: string;
  tenant_id?: string;
}) {
  try { await supabase.from("email_logs").insert(data); } catch (e) { console.error("Failed to log email:", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const now = new Date();
    const results: ReminderResult[] = [];

    const spDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    const spTime = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    const formatDateBR = (dateStr: string) => { const [y, m, d] = dateStr.split("-"); return `${d}/${m}/${y}`; };

    // Cache tenant channel settings
    const tenantSettingsCache: Record<string, TenantChannelSettings> = {};
    const getSettings = async (tenantId: string) => {
      if (!tenantSettingsCache[tenantId]) {
        tenantSettingsCache[tenantId] = await getTenantChannelSettings(supabase, tenantId);
      }
      return tenantSettingsCache[tenantId];
    };

    // ── 24h Reminder Window ──
    const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const date24hFrom = spDate(from24h); const date24hTo = spDate(to24h);
    const time24hFrom = spTime(from24h); const time24hTo = spTime(to24h);

    let query24h = supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_user_id, appointment_date, appointment_time, price, tenant_id, barbers(name), services(name), tenants(name)")
      .eq("reminder_24h_sent", false)
      .in("status", ["pendente", "confirmado"]);

    if (date24hFrom === date24hTo) {
      query24h = query24h.eq("appointment_date", date24hFrom).gte("appointment_time", time24hFrom).lte("appointment_time", time24hTo);
    } else {
      query24h = query24h.gte("appointment_date", date24hFrom).lte("appointment_date", date24hTo);
    }

    const { data: appts24h, error: err24h } = await query24h;
    if (err24h) throw err24h;

    const filtered24h = (appts24h || []).filter((a: any) => {
      if (date24hFrom === date24hTo) return true;
      if (a.appointment_date === date24hFrom && a.appointment_time >= time24hFrom) return true;
      if (a.appointment_date === date24hTo && a.appointment_time <= time24hTo) return true;
      return false;
    });

    const result24h = await processReminders(supabase, supabaseUrl, serviceKey, resendKey, filtered24h, "24h", "reminder_24h_sent", getSettings);
    results.push(result24h);

    // ── 2h Reminder Window ──
    const from2h = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const to2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    const date2hFrom = spDate(from2h); const date2hTo = spDate(to2h);
    const time2hFrom = spTime(from2h); const time2hTo = spTime(to2h);

    let query2h = supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_user_id, appointment_date, appointment_time, price, tenant_id, barbers(name), services(name), tenants(name)")
      .eq("reminder_2h_sent", false)
      .in("status", ["pendente", "confirmado"]);

    if (date2hFrom === date2hTo) {
      query2h = query2h.eq("appointment_date", date2hFrom).gte("appointment_time", time2hFrom).lte("appointment_time", time2hTo);
    } else {
      query2h = query2h.gte("appointment_date", date2hFrom).lte("appointment_date", date2hTo);
    }

    const { data: appts2h, error: err2h } = await query2h;
    if (err2h) throw err2h;

    const filtered2h = (appts2h || []).filter((a: any) => {
      if (date2hFrom === date2hTo) return true;
      if (a.appointment_date === date2hFrom && a.appointment_time >= time2hFrom) return true;
      if (a.appointment_date === date2hTo && a.appointment_time <= time2hTo) return true;
      return false;
    });

    const result2h = await processReminders(supabase, supabaseUrl, serviceKey, resendKey, filtered2h, "2h", "reminder_2h_sent", getSettings);
    results.push(result2h);

    return new Response(JSON.stringify({ status: "success", results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Reminder error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  async function processReminders(
    supabase: any,
    supabaseUrl: string,
    serviceKey: string,
    resendKey: string,
    appointments: any[],
    reminderType: string,
    sentColumn: string,
    getSettings: (tenantId: string) => Promise<TenantChannelSettings>
  ): Promise<ReminderResult> {
    let sent = 0;
    let skipped = 0;

    for (const appt of appointments) {
      const tenantId = appt.tenant_id;
      const channelSettings = tenantId ? await getSettings(tenantId) : null;

      const businessName = escapeHtml((appt.tenants as any)?.name || "Nosso Estabelecimento");
      const staffName = escapeHtml((appt.barbers as any)?.name || "Profissional");
      const serviceName = escapeHtml((appt.services as any)?.name || "Serviço");
      const timeStr = appt.appointment_time.slice(0, 5);
      const dateStr = formatDateBR(appt.appointment_date);

      let didSend = false;

      // ── EMAIL ──
      if (!channelSettings || channelSettings.reminder_email_enabled) {
        let clientEmail: string | null = null;
        if (appt.client_user_id) {
          const { data: profile } = await supabase.from("profiles").select("email").eq("auth_id", appt.client_user_id).maybeSingle();
          clientEmail = profile?.email || null;
        }
        if (!clientEmail && appt.client_phone) {
          const { data: profile } = await supabase.from("profiles").select("email").eq("phone", appt.client_phone).maybeSingle();
          clientEmail = profile?.email || null;
        }

        if (clientEmail) {
          let subject = reminderType === "24h"
            ? `📅 Lembrete: Seu agendamento amanhã em ${businessName}`
            : `⏰ Lembrete: Seu agendamento é em breve!`;

          let html = buildReminderHtml({ clientName: escapeHtml(appt.client_name), businessName, serviceName, staffName, date: dateStr, time: timeStr, reminderType });

          // Use custom template if available
          if (tenantId) {
            const tplType = reminderType === "24h" ? "lembrete_24h" : "lembrete_2h";
            const customTpl = await getCustomTemplate(supabase, tenantId, tplType);
            if (customTpl) {
              const vars = { cliente_nome: appt.client_name, servico: serviceName, profissional: staffName, data: dateStr, hora: timeStr };
              subject = replaceTemplateVariables(customTpl.subject, vars);
              const bodyText = replaceTemplateVariables(customTpl.body, vars);
              html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="white-space: pre-wrap; color: #334155; font-size: 15px; line-height: 1.6;">${templateTextToHtml(bodyText)}</div><p style="color: #999; font-size: 12px; margin-top: 30px;">${businessName} — Zaro Agendamentos</p></div>`;
            }
          }

          try {
            await sendReminderEmail(resendKey, clientEmail, subject, html);
            didSend = true;
            await logEmail(supabase, { appointment_id: appt.id, recipient_email: clientEmail, recipient_name: appt.client_name, email_type: `reminder_${reminderType}`, subject, status: "sent", tenant_id: tenantId });
          } catch (emailErr: any) {
            console.error(`Email failed for ${clientEmail}:`, emailErr);
            await logEmail(supabase, { appointment_id: appt.id, recipient_email: clientEmail, recipient_name: appt.client_name, email_type: `reminder_${reminderType}`, subject, status: "failed", error_message: emailErr.message, tenant_id: tenantId });
          }
        }
      }

      // ── WHATSAPP ── (enqueue via job_queue)
      if (channelSettings?.reminder_whatsapp_enabled && appt.client_phone && tenantId) {
        try {
          await supabase.from("job_queue").insert({
            tenant_id: tenantId,
            type: "send_whatsapp",
            payload: {
              tenant_id: tenantId,
              phone: appt.client_phone,
              message: `Olá ${appt.client_name}! 🔔 Lembrete: seu agendamento de ${serviceName} é ${reminderType === "24h" ? "amanhã" : "em breve"} (${dateStr} às ${timeStr}) em ${businessName}. Te esperamos! 😄`,
            },
          });
          didSend = true;
        } catch (e) { console.error("Failed to enqueue WhatsApp reminder:", e); }
      }

      // ── PUSH ── (enqueue via job_queue)
      if (channelSettings?.reminder_push_enabled && tenantId) {
        try {
          await supabase.from("job_queue").insert({
            tenant_id: tenantId,
            type: "send_push",
            payload: {
              tenant_id: tenantId,
              title: `⏰ Lembrete ${reminderType}`,
              body: `${appt.client_name} — ${serviceName} às ${timeStr}`,
              tag: `reminder-${appt.id}-${reminderType}`,
            },
          });
          didSend = true;
        } catch (e) { console.error("Failed to enqueue push reminder:", e); }
      }

      // ── SMS ── (enqueue via job_queue for future integration)
      if (channelSettings?.reminder_sms_enabled && appt.client_phone && tenantId) {
        try {
          await supabase.from("job_queue").insert({
            tenant_id: tenantId,
            type: "send_sms",
            payload: {
              phone: appt.client_phone,
              message: `Lembrete: ${appt.client_name}, seu agendamento de ${serviceName} é ${reminderType === "24h" ? "amanha" : "em breve"} (${dateStr} às ${timeStr}). ${businessName}`,
            },
          });
          didSend = true;
        } catch (e) { console.error("Failed to enqueue SMS reminder:", e); }
      }

      if (didSend) sent++;
      else skipped++;

      // Mark reminder as sent
      await supabase.from("appointments").update({ [sentColumn]: true }).eq("id", appt.id);
    }

    return { type: reminderType, sent, skipped };
  }

  function formatDateBR(dateStr: string) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
});
