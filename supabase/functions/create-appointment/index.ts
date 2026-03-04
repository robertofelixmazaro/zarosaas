import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      price,
    } = body;

    // Validate required fields
    if (!client_name || !barber_id || !service_id || !appointment_date || !appointment_time || price == null) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios não preenchidos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side time validation (São Paulo timezone)
    const now = new Date();
    const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const today = spNow.toISOString().slice(0, 10);
    
    if (appointment_date < today) {
      return new Response(
        JSON.stringify({ error: "Este horário não está mais disponível." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (appointment_date === today) {
      const currentTime = spNow.toTimeString().slice(0, 5);
      if (appointment_time <= currentTime) {
        return new Response(
          JSON.stringify({ error: "Este horário não está mais disponível." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing active appointment at same slot (advisory lock via SELECT FOR UPDATE pattern)
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("appointment_date", appointment_date)
      .eq("appointment_time", appointment_time)
      .in("status", ["pendente", "confirmado"])
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Este horário já foi reservado. Por favor, escolha outro horário." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check overlapping appointments based on service duration
    const { data: serviceData } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", service_id)
      .single();

    const duration = serviceData?.duration_minutes || 30;

    // Check if new appointment would overlap with existing ones
    const { data: dayAppointments } = await supabase
      .from("appointments")
      .select("appointment_time, services(duration_minutes)")
      .eq("barber_id", barber_id)
      .eq("appointment_date", appointment_date)
      .in("status", ["pendente", "confirmado"]);

    const newStartMin = timeToMinutes(appointment_time);
    const newEndMin = newStartMin + duration;

    const hasOverlap = (dayAppointments || []).some((appt: any) => {
      const existStart = timeToMinutes(appt.appointment_time);
      const existDuration = appt.services?.duration_minutes || 30;
      const existEnd = existStart + existDuration;
      return newStartMin < existEnd && newEndMin > existStart;
    });

    if (hasOverlap) {
      return new Response(
        JSON.stringify({ error: "Este horário conflita com outro agendamento. Por favor, escolha outro." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert with the unique constraint as final safety net
    const { error: insertError } = await supabase
      .from("appointments")
      .insert({
        id: id || crypto.randomUUID(),
        client_name,
        client_phone: client_phone || "",
        barber_id,
        service_id,
        appointment_date,
        appointment_time,
        price,
      });

    if (insertError) {
      // Unique constraint violation
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Este horário acabou de ser reservado. Por favor, escolha outro." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    return new Response(
      JSON.stringify({ status: "success", id: id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Create appointment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
