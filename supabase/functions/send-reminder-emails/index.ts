import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function logEmail(supabase: any, data: {
  appointment_id?: string;
  recipient_email: string;
  recipient_name?: string;
  email_type: string;
  subject: string;
  status: string;
  error_message?: string;
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

  // Authenticate: require service role key
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
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

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    const now = new Date();
    const spFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const spTimeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const today = spFormatter.format(now);
    const currentTime = spTimeFormatter.format(now);

    const in35 = new Date(now.getTime() + 35 * 60 * 1000);
    const timeIn35 = spTimeFormatter.format(in35);

    console.log(`Checking reminders: today=${today}, currentTime=${currentTime}, windowEnd=${timeIn35}`);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, appointment_date, appointment_time, price, barbers(name), services(name), client_user_id")
      .eq("appointment_date", today)
      .eq("reminder_sent", false)
      .in("status", ["pendente", "confirmado"])
      .gte("appointment_time", currentTime)
      .lte("appointment_time", timeIn35);

    if (error) {
      console.error("Query error:", error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} appointments needing reminders`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", reminders_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const appt of appointments) {
      let clientEmail: string | null = null;

      if (appt.client_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("auth_id", appt.client_user_id)
          .single();
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
        console.log(`No email found for ${appt.client_name}, skipping`);
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appt.id);
        continue;
      }

      const timeStr = appt.appointment_time.slice(0, 5);
      const barberName = escapeHtml((appt.barbers as any)?.name || "nosso barbeiro");
      const serviceName = escapeHtml((appt.services as any)?.name || "seu serviço");
      const subject = "⏰ Lembrete: Seu horário é em breve!";

      try {
        await resend.emails.send({
          from: "Corte Certo <onboarding@resend.dev>",
          to: [clientEmail],
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">⏰ Lembrete de Agendamento</h1>
              <p>Olá <strong>${escapeHtml(appt.client_name)}</strong>,</p>
              <p>Este é um lembrete de que seu horário é <strong>em breve</strong>!</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Serviço</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${serviceName}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Horário</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${timeStr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Barbeiro</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${barberName}</td></tr>
              </table>
              <p>Estamos te esperando! 😄</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Corte Certo - Barbearia</p>
            </div>
          `,
        });

        console.log(`Reminder email sent to ${clientEmail} for ${appt.client_name}`);
        sentCount++;

        await logEmail(supabase, {
          appointment_id: appt.id,
          recipient_email: clientEmail,
          recipient_name: appt.client_name,
          email_type: "reminder",
          subject,
          status: "sent",
        });
      } catch (emailErr: any) {
        console.error(`Failed to send reminder to ${clientEmail}:`, emailErr);
        await logEmail(supabase, {
          appointment_id: appt.id,
          recipient_email: clientEmail,
          recipient_name: appt.client_name,
          email_type: "reminder",
          subject,
          status: "failed",
          error_message: emailErr.message,
        });
      }

      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appt.id);
    }

    return new Response(
      JSON.stringify({ status: "success", reminders_sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reminder error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
