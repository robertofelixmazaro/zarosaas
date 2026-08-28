import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Requisição inválida" }, 400);

    const {
      tenant_id,
      barber_id,
      rating,
      comment,
      client_name,
      appointment_id,
      photo_base64,
      photo_mime,
    } = body as Record<string, any>;

    // ---- input validation -------------------------------------------------
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenant_id || !uuidRe.test(String(tenant_id))) return json({ error: "Empresa inválida" }, 400);
    if (!barber_id || !uuidRe.test(String(barber_id))) return json({ error: "Profissional inválido" }, 400);
    if (appointment_id && !uuidRe.test(String(appointment_id))) return json({ error: "Agendamento inválido" }, 400);

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return json({ error: "Nota inválida" }, 400);
    }

    const name = String(client_name || "").trim().slice(0, 100);
    if (name.length < 2) return json({ error: "Informe seu nome" }, 400);
    const cleanComment = comment ? String(comment).trim().slice(0, 1000) : null;

    // ---- tenant / barber relationship ------------------------------------
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, active")
      .eq("id", tenant_id)
      .maybeSingle();
    if (!tenant?.active) return json({ error: "Empresa não encontrada" }, 404);

    const { data: barber } = await admin
      .from("barbers")
      .select("id, tenant_id, active")
      .eq("id", barber_id)
      .maybeSingle();
    if (!barber || barber.tenant_id !== tenant.id) {
      return json({ error: "Profissional não pertence a esta empresa" }, 403);
    }

    // ---- optional: identify the signed-in client --------------------------
    let clientUserId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data: { user } } = await admin.auth.getUser(token);
      clientUserId = user?.id ?? null;
    }

    // ---- appointment must belong to the same tenant (and to the caller) ---
    let linkedAppointmentId: string | null = null;
    if (appointment_id) {
      const { data: appt } = await admin
        .from("appointments")
        .select("id, tenant_id, barber_id, client_user_id")
        .eq("id", appointment_id)
        .maybeSingle();
      if (!appt || appt.tenant_id !== tenant.id || appt.barber_id !== barber.id) {
        return json({ error: "Agendamento inválido para esta avaliação" }, 403);
      }
      if (appt.client_user_id && appt.client_user_id !== clientUserId) {
        return json({ error: "Sem permissão para avaliar este agendamento" }, 403);
      }
      linkedAppointmentId = appt.id;
    }

    // ---- basic anti-spam: 1 review per barber/IP every 5 minutes ----------
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", barber.id)
      .eq("client_name", name)
      .gte("created_at", since);
    if ((recentCount || 0) > 0) {
      return json({ error: "Avaliação já enviada. Aguarde alguns minutos." }, 429);
    }

    // ---- create the review first so the photo can be tied to it -----------
    const { data: review, error: insertErr } = await admin
      .from("reviews")
      .insert({
        barber_id: barber.id,
        tenant_id: tenant.id,
        rating: ratingNum,
        comment: cleanComment,
        appointment_id: linkedAppointmentId,
        client_user_id: clientUserId,
        client_name: name,
        client_photo_url: null,
        approved: false,
      })
      .select("id")
      .single();

    if (insertErr || !review) {
      console.error("Review insert error:", insertErr, "ip:", ip);
      return json({ error: "Erro ao salvar avaliação" }, 500);
    }

    // ---- optional photo: stored as <tenant_id>/<review_id>.<ext> ----------
    if (photo_base64) {
      const ext = ALLOWED_MIME[String(photo_mime || "").toLowerCase()];
      if (!ext) {
        return json({ success: true, review_id: review.id, photo_error: "Formato de imagem não suportado" });
      }

      let bytes: Uint8Array;
      try {
        const raw = String(photo_base64).split(",").pop() || "";
        bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      } catch {
        return json({ success: true, review_id: review.id, photo_error: "Imagem inválida" });
      }

      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        return json({ success: true, review_id: review.id, photo_error: "Imagem acima de 5MB" });
      }

      const path = `${tenant.id}/${review.id}.${ext}`;
      const { error: uploadErr } = await admin.storage
        .from("review-photos")
        .upload(path, bytes, { contentType: String(photo_mime).toLowerCase(), upsert: true });

      if (uploadErr) {
        console.error("Review photo upload error:", uploadErr);
        return json({ success: true, review_id: review.id, photo_error: "Erro ao enviar foto" });
      }

      const { data: urlData } = admin.storage.from("review-photos").getPublicUrl(path);
      await admin.from("reviews").update({ client_photo_url: urlData.publicUrl }).eq("id", review.id);
    }

    return json({ success: true, review_id: review.id });
  } catch (err: any) {
    console.error("submit-review error:", err?.message || err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
