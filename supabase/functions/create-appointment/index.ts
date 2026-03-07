import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

    const body = await req.json();
    const {
      id,
      client_name,
      client_phone,
      barber_id,
      service_id,
      appointment_date,
      appointment_time,
      tenant_id,
    } = body;

    if (!client_name || !barber_id || !service_id || !appointment_date || !appointment_time) {
      return jsonError("Campos obrigatórios não preenchidos.", 400);
    }

    if (!tenant_id) {
      return jsonError("Tenant não identificado.", 400);
    }

    // Verify barber belongs to tenant
    const { data: barber } = await supabase
      .from("barbers")
      .select("id, tenant_id")
      .eq("id", barber_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!barber) {
      return jsonError("Profissional não encontrado neste negócio.", 400);
    }

    // Get service info
    const { data: serviceData } = await supabase
      .from("services")
      .select("duration_minutes, price, is_full_day")
      .eq("id", service_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!serviceData) {
      return jsonError("Serviço não encontrado neste negócio.", 400);
    }

    const isFullDay = serviceData.is_full_day || false;
    const duration = isFullDay ? 1440 : (serviceData.duration_minutes || 30);

    // Server-side time validation (São Paulo timezone)
    const now = new Date();
    const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const today = spNow.toISOString().slice(0, 10);

    if (appointment_date < today) {
      return jsonError("Este horário não está mais disponível.", 409);
    }
    if (!isFullDay && appointment_date === today) {
      const currentTime = spNow.toTimeString().slice(0, 5);
      if (appointment_time <= currentTime) {
        return jsonError("Este horário não está mais disponível.", 409);
      }
    }

    // For full-day services, check if any appointment exists on that day
    if (isFullDay) {
      const { data: existingDay } = await supabase
        .from("appointments")
        .select("id")
        .eq("barber_id", barber_id)
        .eq("tenant_id", tenant_id)
        .eq("appointment_date", appointment_date)
        .in("status", ["pendente", "confirmado"])
        .limit(1);

      if (existingDay && existingDay.length > 0) {
        return jsonError("Este dia já possui agendamentos. Não é possível agendar serviço de dia inteiro.", 409);
      }
    }

    // Check for exact slot conflict
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("tenant_id", tenant_id)
      .eq("appointment_date", appointment_date)
      .eq("appointment_time", appointment_time)
      .in("status", ["pendente", "confirmado"])
      .maybeSingle();

    if (existing) {
      return jsonError("Este horário já foi reservado. Por favor, escolha outro horário.", 409);
    }

    const validatedPrice = serviceData.price;

    // Check overlap with existing appointments
    const { data: dayAppointments } = await supabase
      .from("appointments")
      .select("appointment_time, services(duration_minutes, is_full_day)")
      .eq("barber_id", barber_id)
      .eq("tenant_id", tenant_id)
      .eq("appointment_date", appointment_date)
      .in("status", ["pendente", "confirmado"]);

    const newStartMin = timeToMinutes(appointment_time);
    const newEndMin = newStartMin + duration;

    const hasOverlap = (dayAppointments || []).some((appt: any) => {
      const existIsFullDay = appt.services?.is_full_day || false;
      const existStart = timeToMinutes(appt.appointment_time);
      const existDuration = existIsFullDay ? 1440 : (appt.services?.duration_minutes || 30);
      const existEnd = existStart + existDuration;
      return newStartMin < existEnd && newEndMin > existStart;
    });

    if (hasOverlap) {
      return jsonError("Este horário conflita com outro agendamento. Por favor, escolha outro.", 409);
    }

    // Insert appointment
    const insertData: any = {
      id: id || crypto.randomUUID(),
      client_name,
      client_phone: client_phone || "",
      barber_id,
      service_id,
      appointment_date,
      appointment_time,
      price: validatedPrice,
      tenant_id,
    };

    const { error: insertError } = await supabase
      .from("appointments")
      .insert(insertData);

    if (insertError) {
      // Unique constraint violation (exact same slot)
      if (insertError.code === "23505") {
        return jsonError("Este horário acabou de ser reservado. Por favor, escolha outro.", 409);
      }
      // Overlap trigger violation
      if (insertError.code === "23514" || insertError.message?.includes("APPOINTMENT_OVERLAP")) {
        return jsonError("Este horário conflita com outro agendamento. Por favor, escolha outro.", 409);
      }
      throw insertError;
    }

    // Enqueue background jobs instead of calling functions inline
    const jobs = [
      {
        tenant_id,
        type: "send_notification",
        payload: {
          id_agendamento: insertData.id,
          email_cliente: body.email_cliente || "",
        },
      },
      {
        tenant_id,
        type: "send_push",
        payload: {
          tenant_id,
          title: "Novo agendamento! 📅",
          body: `${client_name} — ${appointment_time}`,
          tag: `appt-${insertData.id}`,
        },
      },
      {
        tenant_id,
        type: "log_activity",
        payload: {
          action: "appointment_created",
          appointment_id: insertData.id,
          client_name,
        },
      },
    ];

    // Insert all jobs in batch (non-blocking — errors won't affect response)
    supabase.from("job_queue").insert(jobs).then(({ error: qErr }: any) => {
      if (qErr) console.error("Failed to enqueue jobs:", qErr.message);
    });

    return new Response(
      JSON.stringify({ status: "success", id: insertData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Create appointment error:", error);
    return jsonError("Erro ao criar agendamento.", 500);
  }
});
