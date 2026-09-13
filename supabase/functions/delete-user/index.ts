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

    const { user_id, profile_id, affiliate_id } = await req.json();
    if (!user_id && !profile_id && !affiliate_id) {
      return new Response(JSON.stringify({ error: "user_id, profile_id or affiliate_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve auth_id from profile / affiliate if needed
    let authId = user_id || null;
    if (!authId && profile_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("auth_id")
        .eq("id", profile_id)
        .maybeSingle();
      authId = profile?.auth_id || null;
    }
    if (!authId && affiliate_id) {
      const { data: aff } = await adminClient
        .from("affiliates")
        .select("user_id")
        .eq("id", affiliate_id)
        .maybeSingle();
      authId = aff?.user_id || null;
    }

    const errors: string[] = [];

    // Affiliates: SOFT delete — financial history (sales, commissions, withdrawals) is preserved
    const softDelete = { deleted_at: new Date().toISOString() };
    if (affiliate_id) {
      const { error: affErr } = await adminClient
        .from("affiliates").update(softDelete).eq("id", affiliate_id).is("deleted_at", null);
      if (affErr) errors.push(`affiliates: ${affErr.message}`);
    }
    if (authId) {
      const { error: affErr } = await adminClient
        .from("affiliates").update(softDelete).eq("user_id", authId).is("deleted_at", null);
      if (affErr) errors.push(`affiliates: ${affErr.message}`);

      // Delete user_roles (role bindings are not history)
      const { error: roleErr } = await adminClient.from("user_roles").delete().eq("user_id", authId);
      if (roleErr) errors.push(`user_roles: ${roleErr.message}`);

      // Unlink staff records instead of deleting them (appointments history stays intact)
      const { error: barberErr } = await adminClient
        .from("barbers").update({ user_id: null, active: false }).eq("user_id", authId);
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
