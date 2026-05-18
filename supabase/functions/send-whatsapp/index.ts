import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Accept both service role key and anon key (for cron job calls)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
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

    const now = new Date();

    // Get all tenants with WhatsApp enabled
    const { data: tenants } = await supabase
      .from("site_settings")
      .select("tenant_id, key, value")
      .in("key", [
        "wa_reminder_enabled",
        "wa_reminder_hours",
        "wa_confirmation_enabled",
        "wa_reminder_message",
        "wa_confirmation_message",
        "wa_appointment_template",
        "wa_api_url",
        "wa_api_key",
        "wa_instance_id",
      ]);

    // Group settings by tenant
    const tenantSettings: Record<string, Record<string, string>> = {};
    (tenants || []).forEach((s: any) => {
      if (!s.tenant_id) return;
      if (!tenantSettings[s.tenant_id]) tenantSettings[s.tenant_id] = {};
      tenantSettings[s.tenant_id][s.key] = s.value;
    });

    let totalSent = 0;
    let totalSkipped = 0;
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "") || "";

    for (const [tenantId, config] of Object.entries(tenantSettings)) {
      const reminderEnabled = config.wa_reminder_enabled === "true";
      const confirmationEnabled = config.wa_confirmation_enabled === "true";
      const apiUrl = config.wa_api_url;
      const apiKey = config.wa_api_key;
      const instanceId = config.wa_instance_id;

      if (!apiUrl || !apiKey) continue;
      if (!reminderEnabled && !confirmationEnabled) continue;

      const reminderHours = parseInt(config.wa_reminder_hours || "2", 10);
      const appointmentTemplate = config.wa_appointment_template || "";
      const reminderMsg = config.wa_reminder_message || "";
      const confirmationMsg = config.wa_confirmation_message || "";

      // Get tenant name + phone
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, slug, phone")
        .eq("id", tenantId)
        .maybeSingle();
      const tenantName = tenant?.name || "Nosso Estabelecimento";
      const tenantSlug = tenant?.slug || "";
      const tenantPhone = tenant?.phone || "";

      // Find appointments in the reminder window
      const fromTime = new Date(now.getTime() + (reminderHours - 0.5) * 60 * 60 * 1000);
      const toTime = new Date(now.getTime() + (reminderHours + 0.5) * 60 * 60 * 1000);

      const spDate = (d: Date) => new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(d);

      const spTime = (d: Date) => new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false
      }).format(d);

      const dateFrom = spDate(fromTime);
      const dateTo = spDate(toTime);

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, price, whatsapp_reminder_sent, attendance_confirmation_status, cep, endereco, numero, bairro, cidade, estado, complemento, barbers(name), services(name)")
        .eq("tenant_id", tenantId)
        .eq("whatsapp_reminder_sent", false)
        .in("status", ["pendente", "confirmado"])
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo);

      for (const appt of (appointments || [])) {
        const phone = formatPhone(appt.client_phone);
        if (!phone) { totalSkipped++; continue; }

        const dateStr = formatDateBR(appt.appointment_date);
        const timeStr = appt.appointment_time.slice(0, 5);
        const serviceName = (appt.services as any)?.name || "Serviço";
        const barberName = (appt.barbers as any)?.name || "";
        const priceStr = appt.price != null
          ? `R$ ${Number(appt.price).toFixed(2).replace(".", ",")}`
          : "";

        // Build public URL for confirmation/cancellation
        const baseUrl = `https://${siteUrl ? siteUrl + ".lovable.app" : "zarosaas.lovable.app"}`;
        const confirmLink = `${baseUrl}/confirmar-agendamento/${appt.id}`;
        const cancelLink = `${baseUrl}/cancelar-agendamento/${appt.id}`;

        const linhaRua = [appt.endereco, appt.numero && `Número ${appt.numero}`].filter(Boolean).join(", ");
        const linhaCidade = [appt.cidade, appt.estado].filter(Boolean).join(" - ");
        const linhaCep = appt.cep ? `CEP ${appt.cep}` : "";
        const linhaCompl = appt.complemento ? `Compl.: ${appt.complemento}` : "";
        const enderecoCliente = (appt.endereco || appt.cep)
          ? ["📍 Endereço:", linhaRua, appt.bairro, linhaCompl, linhaCidade, linhaCep].filter(Boolean).join("\n")
          : "";

        const vars = {
          cliente: appt.client_name,
          empresa: tenantName,
          telefone_empresa: tenantPhone,
          servico: serviceName,
          profissional: barberName,
          data: dateStr,
          hora: timeStr,
          horario: timeStr,
          valor: priceStr,
          link_confirmacao: confirmLink,
          link_cancelamento: cancelLink,
          endereco_cliente: enderecoCliente,
        };

        // Prefer the new unified template if defined.
        const baseTemplate = appointmentTemplate
          || (reminderEnabled && confirmationEnabled ? confirmationMsg : reminderMsg);

        if (!baseTemplate) continue;
        const message = replaceVariables(baseTemplate, vars);

        if (!message) continue;

        try {
          await sendWhatsAppMessage(apiUrl, apiKey, instanceId, phone, message);
          totalSent++;

          await supabase
            .from("appointments")
            .update({ whatsapp_reminder_sent: true })
            .eq("id", appt.id);
        } catch (err) {
          console.error(`Failed to send WhatsApp to ${phone}:`, err);
          totalSkipped++;
        }
      }
    }

    return new Response(
      JSON.stringify({ status: "success", sent: totalSent, skipped: totalSkipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("WhatsApp reminder error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPhone(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = "55" + digits;
  return digits;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const v = value ?? "";
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), v);
    result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), v);
  }
  return result;
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instanceId: string,
  phone: string,
  message: string
): Promise<void> {
  // Support multiple API formats (Evolution API, Z-API, generic)
  const url = apiUrl.endsWith("/")
    ? `${apiUrl}message/sendText/${instanceId}`
    : `${apiUrl}/message/sendText/${instanceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp API error [${res.status}]: ${errText}`);
  }
  await res.text(); // consume body
}
