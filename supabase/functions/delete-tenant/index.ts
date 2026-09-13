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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cascade delete all tenant data in order (respect FK constraints)
    // Only include tables that have a tenant_id column
    const tenantTables = [
      "order_items", "orders", "email_logs", "blocked_dates",
      "barber_availability", "appointments", "reviews", "gallery_items",
      "products", "services", "barbers", "site_settings",
      "payments", "subscriptions",
      "profiles", "user_roles",
    ];

    const errors: string[] = [];

    // Collect auth users linked to this tenant BEFORE profiles are removed,
    // so no orphan login accounts remain listed as users.
    const { data: tenantProfiles } = await supabaseAdmin
      .from("profiles")
      .select("auth_id")
      .eq("tenant_id", tenant_id);
    const authIds = (tenantProfiles || [])
      .map((p: { auth_id: string | null }) => p.auth_id)
      .filter((id: string | null): id is string => !!id && id !== user.id);

    for (const table of tenantTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("tenant_id", tenant_id);
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message);
        errors.push(`${table}: ${error.message}`);
      }
    }

    // Role bindings without tenant_id still point to these users
    if (authIds.length > 0) {
      const { error: roleErr } = await supabaseAdmin.from("user_roles").delete().in("user_id", authIds);
      if (roleErr) errors.push(`user_roles(by user): ${roleErr.message}`);
    }

    // Now delete the tenant itself
    const { error: tenantDeleteError } = await supabaseAdmin.from("tenants").delete().eq("id", tenant_id);
    if (tenantDeleteError) {
      console.error("Error deleting tenant:", tenantDeleteError.message);
      // Fallback: mark as inactive
      await supabaseAdmin.from("tenants").update({ active: false }).eq("id", tenant_id);
      return new Response(JSON.stringify({ 
        success: false, 
        fallback: true,
        message: "Não foi possível excluir a loja. Ela foi desativada.",
        errors: [...errors, tenantDeleteError.message],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
