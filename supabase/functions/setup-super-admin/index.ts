import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const email = "admin@zaroagendamentos.com";
    const password = "Admin123!";

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update password
      await adminClient.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      // Create user
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "Super Admin" },
      });
      if (createErr) throw createErr;
      userId = newUser.user.id;
    }

    // Ensure profile exists
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("auth_id", userId)
      .maybeSingle();

    if (!profile) {
      await adminClient.from("profiles").insert({
        auth_id: userId,
        name: "Super Admin",
        email,
      });
    }

    // Upsert super_admin role (no tenant_id needed)
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      await adminClient
        .from("user_roles")
        .update({ role: "super_admin" })
        .eq("id", existingRole.id);
    } else {
      await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });
    }

    return new Response(
      JSON.stringify({ success: true, userId, message: "Super admin criado/atualizado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
