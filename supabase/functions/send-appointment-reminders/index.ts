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
      from: "Zaro Agendamentos <onboarding@resend.dev>",
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
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Serviço</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Profissional</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.staffName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Data</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${data.date}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b;">Horário</td>
            <td style="padding: 12px 16px; font-weight: bold; color: #1e293b;">${data.time}</td>
          </tr>
        </table>
        
        <p style="color: #334155; font-size: 16px;">Nos vemos lá! 😄</p>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          ${data.businessName} — Zaro Agendamentos
        </p>
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
  try {
    await supabase.from("email_logs").insert(data);
  } catch (e) {
    console.error("Failed to log email:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: validate service role key
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const now = new Date();
    const results: ReminderResult[] = [];

    // Helper: format date to YYYY-MM-DD in São Paulo timezone
    const spDate = (d: Date) => new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(d);

    const spTime = (d: Date) => new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d);

    const formatDateBR = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    };

    // ── 24h Reminder Window ──
    // Find appointments happening between 23h and 25h from now
    const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const to24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const date24hFrom = spDate(from24h);
    const date24hTo = spDate(to24h);
    const time24hFrom = spTime(from24h);
    const time24hTo = spTime(to24h);

    console.log(`24h window: ${date24hFrom} ${time24hFrom} to ${date24hTo} ${time24hTo}`);

    // Query for 24h reminders - handle same day or cross-day
    let query24h = supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_user_id, appointment_date, appointment_time, price, tenant_id, barbers(name), services(name), tenants(name)")
      .eq("reminder_24h_sent", false)
      .in("status", ["pendente", "confirmado"]);

    if (date24hFrom === date24hTo) {
      query24h = query24h
        .eq("appointment_date", date24hFrom)
        .gte("appointment_time", time24hFrom)
        .lte("appointment_time", time24hTo);
    } else {
      // Cross-day: get both days and filter
      query24h = query24h
        .gte("appointment_date", date24hFrom)
        .lte("appointment_date", date24hTo);
    }

    const { data: appts24h, error: err24h } = await query24h;
    if (err24h) {
      console.error("24h query error:", err24h);
      throw err24h;
    }

    // Filter cross-day results more precisely
    const filtered24h = (appts24h || []).filter((a: any) => {
      if (date24hFrom === date24hTo) return true;
      if (a.appointment_date === date24hFrom && a.appointment_time >= time24hFrom) return true;
      if (a.appointment_date === date24hTo && a.appointment_time <= time24hTo) return true;
      return false;
    });

    console.log(`Found ${filtered24h.length} appointments for 24h reminder`);

    const result24h = await processReminders(supabase, resendKey, filtered24h, "24h", "reminder_24h_sent");
    results.push(result24h);

    // ── 2h Reminder Window ──
    const from2h = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const to2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    const date2hFrom = spDate(from2h);
    const date2hTo = spDate(to2h);
    const time2hFrom = spTime(from2h);
    const time2hTo = spTime(to2h);

    console.log(`2h window: ${date2hFrom} ${time2hFrom} to ${date2hTo} ${time2hTo}`);

    let query2h = supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_user_id, appointment_date, appointment_time, price, tenant_id, barbers(name), services(name), tenants(name)")
      .eq("reminder_2h_sent", false)
      .in("status", ["pendente", "confirmado"]);

    if (date2hFrom === date2hTo) {
      query2h = query2h
        .eq("appointment_date", date2hFrom)
        .gte("appointment_time", time2hFrom)
        .lte("appointment_time", time2hTo);
    } else {
      query2h = query2h
        .gte("appointment_date", date2hFrom)
        .lte("appointment_date", date2hTo);
    }

    const { data: appts2h, error: err2h } = await query2h;
    if (err2h) {
      console.error("2h query error:", err2h);
      throw err2h;
    }

    const filtered2h = (appts2h || []).filter((a: any) => {
      if (date2hFrom === date2hTo) return true;
      if (a.appointment_date === date2hFrom && a.appointment_time >= time2hFrom) return true;
      if (a.appointment_date === date2hTo && a.appointment_time <= time2hTo) return true;
      return false;
    });

    console.log(`Found ${filtered2h.length} appointments for 2h reminder`);

    const result2h = await processReminders(supabase, resendKey, filtered2h, "2h", "reminder_2h_sent");
    results.push(result2h);

    return new Response(
      JSON.stringify({ status: "success", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reminder error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  async function processReminders(
    supabase: any,
    resendKey: string,
    appointments: any[],
    reminderType: string,
    sentColumn: string
  ): Promise<ReminderResult> {
    let sent = 0;
    let skipped = 0;

    const formatDateBR = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    };

    for (const appt of appointments) {
      let clientEmail: string | null = null;

      // Try to find email from profile
      if (appt.client_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("auth_id", appt.client_user_id)
          .maybeSingle();
        clientEmail = profile?.email || null;
      }

      if (!clientEmail && appt.client_phone) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("phone", appt.client_phone)
          .maybeSingle();
        clientEmail = profile?.email || null;
      }

      if (!clientEmail) {
        console.log(`No email for ${appt.client_name}, marking ${sentColumn}`);
        await supabase
          .from("appointments")
          .update({ [sentColumn]: true })
          .eq("id", appt.id);
        skipped++;
        continue;
      }

      const businessName = escapeHtml((appt.tenants as any)?.name || "Nosso Estabelecimento");
      const staffName = escapeHtml((appt.barbers as any)?.name || "Profissional");
      const serviceName = escapeHtml((appt.services as any)?.name || "Serviço");
      const timeStr = appt.appointment_time.slice(0, 5);
      const dateStr = formatDateBR(appt.appointment_date);

      const subject = reminderType === "24h"
        ? `📅 Lembrete: Seu agendamento amanhã em ${businessName}`
        : `⏰ Lembrete: Seu agendamento é em breve!`;

      const html = buildReminderHtml({
        clientName: escapeHtml(appt.client_name),
        businessName,
        serviceName,
        staffName,
        date: dateStr,
        time: timeStr,
        reminderType,
      });

      try {
        await sendReminderEmail(resendKey, clientEmail, subject, html);
        console.log(`${reminderType} reminder sent to ${clientEmail} for ${appt.client_name}`);
        sent++;

        await logEmail(supabase, {
          appointment_id: appt.id,
          recipient_email: clientEmail,
          recipient_name: appt.client_name,
          email_type: `reminder_${reminderType}`,
          subject,
          status: "sent",
          tenant_id: appt.tenant_id,
        });
      } catch (emailErr: any) {
        console.error(`Failed ${reminderType} reminder to ${clientEmail}:`, emailErr);
        await logEmail(supabase, {
          appointment_id: appt.id,
          recipient_email: clientEmail,
          recipient_name: appt.client_name,
          email_type: `reminder_${reminderType}`,
          subject,
          status: "failed",
          error_message: emailErr.message,
          tenant_id: appt.tenant_id,
        });
      }

      await supabase
        .from("appointments")
        .update({ [sentColumn]: true })
        .eq("id", appt.id);
    }

    return { type: reminderType, sent, skipped };
  }
});
