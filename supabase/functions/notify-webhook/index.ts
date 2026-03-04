import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    const body = await req.json();
    const {
      nome_cliente,
      email_cliente,
      telefone_cliente,
      servico,
      data_agendamento,
      hora_agendamento,
      id_agendamento,
    } = body;

    if (!id_agendamento || !nome_cliente || !servico) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if webhook was already sent
    const { data: appointment } = await supabase
      .from("appointments")
      .select("webhook_sent")
      .eq("id", id_agendamento)
      .single();

    if (appointment?.webhook_sent) {
      return new Response(
        JSON.stringify({ status: "already_sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dateFormatted = data_agendamento
      ? data_agendamento.split("-").reverse().join("/")
      : "";

    const clientSubject = "Confirmação de Agendamento – Corte Certo";
    const adminSubject = "Novo Agendamento Recebido";

    // Send confirmation email to client
    if (email_cliente) {
      try {
        await resend.emails.send({
          from: "Corte Certo <onboarding@resend.dev>",
          to: [email_cliente],
          subject: clientSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">✂️ Agendamento Confirmado!</h1>
              <p>Olá <strong>${nome_cliente}</strong>,</p>
              <p>Seu agendamento foi confirmado com sucesso:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Serviço</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${servico}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Data</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${dateFormatted}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Horário</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${hora_agendamento}</td></tr>
              </table>
              <p>Estamos te esperando! 😄</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Corte Certo - Barbearia</p>
            </div>
          `,
        });
        console.log(`Client email sent to ${email_cliente}`);
        await logEmail(supabase, {
          appointment_id: id_agendamento,
          recipient_email: email_cliente,
          recipient_name: nome_cliente,
          email_type: "confirmation",
          subject: clientSubject,
          status: "sent",
        });
      } catch (emailErr: any) {
        console.error("Failed to send client email:", emailErr);
        await logEmail(supabase, {
          appointment_id: id_agendamento,
          recipient_email: email_cliente,
          recipient_name: nome_cliente,
          email_type: "confirmation",
          subject: clientSubject,
          status: "failed",
          error_message: emailErr.message,
        });
      }
    }

    // Send notification email to barbershop
    const adminEmail = "caetanobarbers@gmail.com";
    try {
      await resend.emails.send({
        from: "Corte Certo <onboarding@resend.dev>",
        to: [adminEmail],
        subject: adminSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🔔 Novo Agendamento</h1>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Cliente</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${nome_cliente}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">E-mail</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email_cliente || "Não informado"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Telefone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${telefone_cliente || "Não informado"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Serviço</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${servico}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Data</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${dateFormatted}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Horário</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${hora_agendamento}</td></tr>
            </table>
            <p style="color: #999; font-size: 12px;">ID: ${id_agendamento}</p>
          </div>
        `,
      });
      console.log("Admin email sent to " + adminEmail);
      await logEmail(supabase, {
        appointment_id: id_agendamento,
        recipient_email: adminEmail,
        recipient_name: "Admin",
        email_type: "notification",
        subject: adminSubject,
        status: "sent",
      });
    } catch (emailErr: any) {
      console.error("Failed to send admin email:", emailErr);
      await logEmail(supabase, {
        appointment_id: id_agendamento,
        recipient_email: adminEmail,
        recipient_name: "Admin",
        email_type: "notification",
        subject: adminSubject,
        status: "failed",
        error_message: emailErr.message,
      });
    }

    // Also send to n8n webhook if configured
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "webhook_url")
      .single();

    if (setting?.value) {
      try {
        await fetch(setting.value, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome_cliente,
            email_cliente: email_cliente || "",
            telefone_cliente,
            servico,
            data_agendamento,
            hora_agendamento,
            id_agendamento,
          }),
        });
      } catch (webhookErr) {
        console.error("Webhook delivery failed:", webhookErr);
      }
    }

    // Mark as sent
    await supabase
      .from("appointments")
      .update({ webhook_sent: true })
      .eq("id", id_agendamento);

    return new Response(
      JSON.stringify({ status: "success", message: "Emails sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
