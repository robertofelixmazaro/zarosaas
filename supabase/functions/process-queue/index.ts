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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const BATCH_SIZE = 20;
  const LOCK_TIMEOUT_MINUTES = 5;

  try {
    // 1. Fetch pending jobs (skip locked ones)
    const lockCutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

    const { data: jobs, error: fetchErr } = await supabase
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .or(`locked_at.is.null,locked_at.lt.${lockCutoff}`)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobIds = jobs.map((j: any) => j.id);

    // 2. Lock jobs
    await supabase
      .from("job_queue")
      .update({ locked_at: new Date().toISOString() })
      .in("id", jobIds);

    let processed = 0;
    let failed = 0;

    // 3. Process each job
    for (const job of jobs) {
      try {
        await processJob(supabase, supabaseUrl, serviceKey, job);

        await supabase
          .from("job_queue")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            locked_at: null,
          })
          .eq("id", job.id);

        processed++;
      } catch (err: any) {
        const attempts = (job.attempts || 0) + 1;
        const newStatus = attempts >= (job.max_attempts || 3) ? "failed" : "pending";

        await supabase
          .from("job_queue")
          .update({
            status: newStatus,
            attempts,
            error_message: err.message?.slice(0, 500),
            locked_at: null,
          })
          .eq("id", job.id);

        failed++;
        console.error(`Job ${job.id} (${job.type}) failed:`, err.message);
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: jobs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Queue worker error:", error);
    return new Response(
      JSON.stringify({ error: "Erro no processamento da fila." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processJob(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: any
) {
  const { type, payload } = job;

  switch (type) {
    case "send_notification": {
      // Trigger notify-webhook
      const res = await fetch(`${supabaseUrl}/functions/v1/notify-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`notify-webhook: ${res.status} ${text}`);
      break;
    }

    case "send_push": {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`send-push: ${res.status} ${text}`);
      break;
    }

    case "send_email": {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-reminder-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`send-email: ${res.status} ${text}`);
      break;
    }

    case "send_whatsapp": {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`send-whatsapp: ${res.status} ${text}`);
      break;
    }

    case "send_sms": {
      // SMS integration placeholder — log for now, ready for Twilio/Vonage integration
      console.log(`[SMS] tenant=${job.tenant_id} phone=${payload.phone} message=${payload.message?.slice(0, 80)}`);
      break;
    }

    case "log_activity": {
      console.log(`[Activity Log] tenant=${job.tenant_id}`, JSON.stringify(payload));
      break;
    }

    case "update_dashboard": {
      // Placeholder for future dashboard cache/stats refresh
      console.log(`[Dashboard Update] tenant=${job.tenant_id}`);
      break;
    }

    default:
      console.warn(`Unknown job type: ${type}`);
  }
}
