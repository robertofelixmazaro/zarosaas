import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Não autenticado" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return jsonResp({ error: "Não autenticado" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) return jsonResp({ error: "Acesso negado" }, 403);

    const { name, email, password, commission_percent, phone, whatsapp, cpf, pix_type, pix_key } = await req.json();

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return jsonResp({ error: "Nome, email e senha são obrigatórios" }, 400);
    }

    const commissionPct = Number(commission_percent) || 10;

    // 1. Create auth user (email pre-confirmed)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        account_type: "affiliate",
      },
    });

    if (createErr) {
      const msg = createErr.message?.includes("already been registered")
        ? "Este email já está cadastrado no sistema"
        : "Erro ao criar usuário: " + createErr.message;
      return jsonResp({ error: msg }, 400);
    }

    const newUserId = newUser.user.id;

    // 2. Ensure profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("auth_id", newUserId)
      .maybeSingle();

    const profileData: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
    };
    if (phone?.trim()) profileData.phone = phone.trim();
    if (whatsapp?.trim()) profileData.whatsapp = whatsapp.trim();
    if (cpf?.trim()) profileData.cpf = cpf.trim();

    if (existingProfile) {
      await adminClient
        .from("profiles")
        .update(profileData)
        .eq("auth_id", newUserId);
    } else {
      await adminClient
        .from("profiles")
        .insert({ auth_id: newUserId, ...profileData });
    }

    // 3. Ensure user_role exists as affiliate
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", newUserId)
      .maybeSingle();

    if (existingRole) {
      await adminClient
        .from("user_roles")
        .update({ role: "affiliate" })
        .eq("user_id", newUserId);
    } else {
      await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: "affiliate" });
    }

    // 4. Generate unique ref_code
    const refCode = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 10)
      + Date.now().toString(36).slice(-4);

    // 5. Create affiliate record (check if trigger already created one)
    const affiliateData: Record<string, unknown> = {
      commission_percent: commissionPct,
    };
    if (phone?.trim()) affiliateData.phone = phone.trim();
    if (whatsapp?.trim()) affiliateData.whatsapp = whatsapp.trim();
    if (cpf?.trim()) affiliateData.cpf = cpf.trim();
    if (pix_type?.trim()) affiliateData.pix_type = pix_type.trim();
    if (pix_key?.trim()) affiliateData.pix_key = pix_key.trim();

    const { data: existingAff } = await adminClient
      .from("affiliates")
      .select("id")
      .eq("user_id", newUserId)
      .maybeSingle();

    if (existingAff) {
      await adminClient
        .from("affiliates")
        .update(affiliateData)
        .eq("user_id", newUserId);
    } else {
      const { error: affErr } = await adminClient
        .from("affiliates")
        .insert({
          user_id: newUserId,
          ref_code: refCode,
          ...affiliateData,
        });

      if (affErr) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return jsonResp({ error: "Erro ao criar afiliado: " + affErr.message }, 500);
      }
    }

    console.log(`Affiliate created: ${email.trim()} (${newUserId})`);

    return jsonResp({
      success: true,
      affiliate: { email: email.trim(), ref_code: refCode },
      credentials: { email: email.trim(), password: password.trim() },
    });
  } catch (err) {
    console.error("Create affiliate error:", err);
    return jsonResp({ error: "Erro interno do servidor" }, 500);
  }
});
