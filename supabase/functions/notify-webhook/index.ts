import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate that the caller is using the service role key (server-to-server only)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    const body = await req.json();
    const { id_agendamento } = body;

    if (!id_agendamento) {
      return new Response(
        JSON.stringify({ error: "Missing id_agendamento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load appointment data from DB instead of trusting request body
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, appointment_date, appointment_time, webhook_sent, client_user_id, services(name), barbers(name), tenant_id")
      .eq("id", id_agendamento)
      .single();

    if (apptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (appointment.webhook_sent) {
      return new Response(
        JSON.stringify({ status: "already_sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nome_cliente = appointment.client_name;
    const telefone_cliente = appointment.client_phone;
    const servico = (appointment.services as any)?.name || "Serviço";
    const data_agendamento = appointment.appointment_date;
    const hora_agendamento = appointment.appointment_time?.slice(0, 5) || "";

    // Look up client email from profiles
    let email_cliente: string | null = null;
    if (appointment.client_user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("auth_id", appointment.client_user_id)
        .single();
      email_cliente = profile?.email || null;
    }
    if (!email_cliente && telefone_cliente) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", telefone_cliente)
        .maybeSingle();
      email_cliente = profile?.email || null;
    }
    // Also accept email from body as fallback
    if (!email_cliente && body.email_cliente) {
      email_cliente = body.email_cliente;
    }

    // Escape all values for HTML
    const safeNome = escapeHtml(nome_cliente);
    const safeServico = escapeHtml(servico);
    const safeTelefone = escapeHtml(telefone_cliente || "Não informado");
    const safeEmail = escapeHtml(email_cliente || "Não informado");

    const dateFormatted = data_agendamento
      ? String(data_agendamento).split("-").reverse().join("/")
      : "";

    const clientSubject = "Confirmação de Agendamento – Zaro Agendamentos";
    const adminSubject = "Novo Agendamento Recebido";

    // Send confirmation email to client
    if (email_cliente) {
      try {
        await resend.emails.send({
          from: "Zaro Agendamentos <noreply@zarosistemas.com.br>",
          to: [email_cliente],
          subject: clientSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">✂️ Agendamento Confirmado!</h1>
              <p>Olá <strong>${safeNome}</strong>,</p>
              <p>Seu agendamento foi confirmado com sucesso:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Serviço</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${safeServico}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Data</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(dateFormatted)}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Horário</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(hora_agendamento)}</td></tr>
              </table>
              <p>Estamos te esperando! 😄</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Zaro Agendamentos</p>
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

    // Send notification to tenant admin - look up from tenant settings
    let adminEmail: string | null = null;
    if (appointment.tenant_id) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_email")
        .eq("tenant_id", appointment.tenant_id)
        .maybeSingle();
      adminEmail = setting?.value || null;

      if (!adminEmail) {
        // Fallback: get tenant owner email from profiles
        const { data: tenant } = await supabase
          .from("tenants")
          .select("owner_user_id")
          .eq("id", appointment.tenant_id)
          .single();
        if (tenant?.owner_user_id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("auth_id", tenant.owner_user_id)
            .single();
          adminEmail = ownerProfile?.email || null;
        }
      }
    }

    if (adminEmail) {
      try {
        await resend.emails.send({
          from: "Zaro Agendamentos <noreply@zarosistemas.com.br>",
          to: [adminEmail],
          subject: adminSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">🔔 Novo Agendamento</h1>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Cliente</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${safeNome}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">E-mail</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeEmail}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Telefone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${safeTelefone}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Serviço</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${safeServico}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Data</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(dateFormatted)}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Horário</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(hora_agendamento)}</td></tr>
              </table>
              <p style="color: #999; font-size: 12px;">ID: ${escapeHtml(id_agendamento)}</p>
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
    }

    // Also send to n8n webhook if configured
    if (appointment.tenant_id) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "webhook_url")
        .eq("tenant_id", appointment.tenant_id)
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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
