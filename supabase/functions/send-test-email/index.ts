import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify super admin
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: role } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!role) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to } = await req.json();
    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: "Zaro Agendamentos <noreply@zarosistemas.com.br>",
      to: [to],
      subject: "✅ Email de Teste - Zaro Agendamentos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #2563eb;">
            <h1 style="color: #1e293b; margin: 0; font-size: 24px;">✅ Email de Teste</h1>
          </div>
          <div style="padding: 24px 0;">
            <p style="color: #334155; font-size: 16px;">Este é um email de teste da plataforma <strong>Zaro Agendamentos</strong>.</p>
            <p style="color: #334155; font-size: 16px;">Se você recebeu este email, o sistema de envio está funcionando corretamente! 🎉</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
              <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Remetente</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">noreply@zarosistemas.com.br</td></tr>
              <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Destinatário</td><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${to}</td></tr>
              <tr><td style="padding: 12px 16px; color: #64748b;">Data</td><td style="padding: 12px 16px; font-weight: bold; color: #1e293b;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
            </table>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Zaro Agendamentos — Sistema de Agendamentos</p>
          </div>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Email de teste enviado para ${to}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
