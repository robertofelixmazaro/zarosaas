/**
 * Automatic WhatsApp messages dispatcher (internal only).
 *
 * Modes:
 *   { mode: "new_appointment", appointment_id }  → immediate client + owner messages
 *   { mode: "cron" }                             → 1-day and 2-hour reminders
 *
 * Sending always goes through the existing Evolution Go service, using the
 * per-tenant configuration in whatsapp_go_configs. No global token, ever.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { WhatsAppGoConfig } from "../_shared/whatsappGo.ts";
import {
  addDays,
  buildVars,
  nowInTimezone,
  renderTemplate,
  sendAutoMessage,
  toMinutes,
  type AutoSettings,
} from "../_shared/whatsappAuto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const APPT_SELECT =
  "id, tenant_id, client_name, client_phone, appointment_date, appointment_time, status, services(name), barbers(name)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const callerToken = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  let authorized = !!serviceKey && callerToken === serviceKey;
  if (!authorized && callerToken) {
    const { data: cronSecret } = await admin.rpc("get_queue_cron_secret");
    authorized = !!cronSecret && callerToken === cronSecret;
  }
  if (!authorized) return json({ error: "Não autorizado" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = String(body.mode || "cron");

  const loadSettings = async (tenantId: string): Promise<AutoSettings | null> => {
    const { data } = await admin
      .from("whatsapp_auto_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return (data as AutoSettings) ?? null;
  };

  const loadConfig = async (tenantId: string): Promise<WhatsAppGoConfig | null> => {
    const { data } = await admin
      .from("whatsapp_go_configs")
      .select("base_url, instance_token, instance_name")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return (data as WhatsAppGoConfig) ?? null;
  };

  const loadTenant = async (tenantId: string) => {
    const { data } = await admin
      .from("tenants")
      .select("name, address, phone")
      .eq("id", tenantId)
      .maybeSingle();
    return data as { name: string | null; address: string | null; phone: string | null } | null;
  };

  try {
    // ─────────── IMMEDIATE CONFIRMATION ───────────
    if (mode === "new_appointment") {
      const appointmentId = String(body.appointment_id || "");
      if (!appointmentId) return json({ error: "appointment_id obrigatório." }, 400);

      const { data: appt } = await admin.from("appointments").select(APPT_SELECT).eq("id", appointmentId).maybeSingle();
      if (!appt) return json({ skipped: "appointment_not_found" });

      const settings = await loadSettings(appt.tenant_id);
      if (!settings) return json({ skipped: "no_settings" });

      const [config, tenant] = await Promise.all([loadConfig(appt.tenant_id), loadTenant(appt.tenant_id)]);
      const vars = buildVars(appt as any, tenant);
      const results: Record<string, unknown> = {};

      if (settings.confirm_client_enabled) {
        results.client = await sendAutoMessage(admin, {
          tenantId: appt.tenant_id,
          appointmentId: appt.id,
          type: "booking_confirmation_client",
          phone: appt.client_phone,
          text: renderTemplate(settings.confirm_client_template, vars),
          config,
        });
      }

      if (settings.confirm_owner_enabled) {
        results.owner = await sendAutoMessage(admin, {
          tenantId: appt.tenant_id,
          appointmentId: appt.id,
          type: "booking_confirmation_owner",
          phone: settings.owner_phone || tenant?.phone || null,
          text: renderTemplate(settings.confirm_owner_template, vars),
          config,
        });
      }

      return json({ ok: true, results });
    }

    // ─────────── CRON: REMINDERS ───────────
    const { data: tenantSettings } = await admin
      .from("whatsapp_auto_settings")
      .select("*")
      .or("reminder_1d_enabled.eq.true,reminder_2h_enabled.eq.true");

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const settings of (tenantSettings ?? []) as AutoSettings[]) {
      const tz = settings.timezone || "America/Sao_Paulo";
      const now = nowInTimezone(tz);
      const config = await loadConfig(settings.tenant_id);
      if (!config) continue;
      const tenant = await loadTenant(settings.tenant_id);

      const handle = async (
        appt: any,
        type: "reminder_1_day" | "reminder_2_hours",
        template: string,
      ) => {
        const vars = buildVars(appt, tenant);
        const res = await sendAutoMessage(admin, {
          tenantId: settings.tenant_id,
          appointmentId: appt.id,
          type,
          phone: appt.client_phone,
          text: renderTemplate(template, vars),
          config,
        });
        if (res.sent) sent++;
        else if (res.error) failed++;
        else skipped++;
      };

      // ── 1 day before, at the tenant's configured local time ──
      if (settings.reminder_1d_enabled && now.minutes >= toMinutes(settings.reminder_1d_time)) {
        const target = addDays(now.date, 1);
        const { data: appts } = await admin
          .from("appointments")
          .select(APPT_SELECT)
          .eq("tenant_id", settings.tenant_id)
          .eq("appointment_date", target)
          .in("status", ["pendente", "confirmado"]);
        for (const appt of appts ?? []) await handle(appt, "reminder_1_day", settings.reminder_1d_template);
      }

      // ── 2 hours before the appointment (tenant local time) ──
      if (settings.reminder_2h_enabled) {
        const dates = [now.date, addDays(now.date, 1)];
        const { data: appts } = await admin
          .from("appointments")
          .select(APPT_SELECT)
          .eq("tenant_id", settings.tenant_id)
          .in("appointment_date", dates)
          .in("status", ["pendente", "confirmado"]);

        for (const appt of appts ?? []) {
          const dayOffset = appt.appointment_date === now.date ? 0 : 1440;
          const minutesUntil = dayOffset + toMinutes(appt.appointment_time) - now.minutes;
          if (minutesUntil <= 120 && minutesUntil > 0) {
            await handle(appt, "reminder_2_hours", settings.reminder_2h_template);
          }
        }
      }
    }

    return json({ ok: true, sent, skipped, failed });
  } catch (_e) {
    return json({ error: "Erro ao processar mensagens automáticas." }, 500);
  }
});
