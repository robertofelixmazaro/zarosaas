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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, profile_id } = await req.json();
    if (!user_id && !profile_id) {
      return new Response(JSON.stringify({ error: "user_id or profile_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve auth_id from profile if needed
    let authId = user_id;
    if (!authId && profile_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("auth_id")
        .eq("id", profile_id)
        .maybeSingle();
      authId = profile?.auth_id || null;
    }

    const errors: string[] = [];

    // Delete from application tables using auth_id
    if (authId) {
      // Delete affiliates
      const { error: affErr } = await adminClient.from("affiliates").delete().eq("user_id", authId);
      if (affErr) errors.push(`affiliates: ${affErr.message}`);

      // Delete user_roles
      const { error: roleErr } = await adminClient.from("user_roles").delete().eq("user_id", authId);
      if (roleErr) errors.push(`user_roles: ${roleErr.message}`);

      // Delete barbers linked to this user
      const { error: barberErr } = await adminClient.from("barbers").delete().eq("user_id", authId);
      if (barberErr) errors.push(`barbers: ${barberErr.message}`);
    }

    // Delete profile
    if (profile_id) {
      const { error: profErr } = await adminClient.from("profiles").delete().eq("id", profile_id);
      if (profErr) errors.push(`profiles: ${profErr.message}`);
    } else if (authId) {
      const { error: profErr } = await adminClient.from("profiles").delete().eq("auth_id", authId);
      if (profErr) errors.push(`profiles: ${profErr.message}`);
    }

    // Delete from auth.users — this is the critical step
    if (authId) {
      const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(authId);
      if (authDeleteErr) {
        errors.push(`auth.users: ${authDeleteErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
