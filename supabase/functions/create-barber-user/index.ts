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
    const authHeader = req.headers.get("Authorization")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { barber_id, email, password } = await req.json();
    if (!barber_id || !email || !password) {
      return new Response(JSON.stringify({ error: "barber_id, email e password são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if barber already has a user_id
    const { data: barber } = await adminClient.from("barbers").select("user_id, name").eq("id", barber_id).single();
    if (!barber) {
      return new Response(JSON.stringify({ error: "Barbeiro não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (barber.user_id) {
      // Update existing user's email/password
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(barber.user_id, {
        email,
        password,
        email_confirm: true,
      });
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, message: "Credenciais atualizadas" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create new user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: barber.name },
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Assign barber role
    await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "barber" });

    // Link user to barber
    await adminClient.from("barbers").update({ user_id: newUser.user.id }).eq("id", barber_id);

    return new Response(JSON.stringify({ success: true, message: "Acesso criado com sucesso" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
