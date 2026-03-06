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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, auth_id, tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    // Check if role exists
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id, role, tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const accountType = user.user_metadata?.account_type || "admin";
    let role: string;
    switch (accountType) {
      case "affiliate": role = "affiliate"; break;
      case "staff": role = "staff"; break;
      default: role = "admin"; break;
    }

    const tenantId = user.user_metadata?.tenant_id || null;

    // Create profile if missing
    if (!existingProfile) {
      const { error: profileErr } = await adminClient
        .from("profiles")
        .insert({
          auth_id: user.id,
          name: user.user_metadata?.name || user.email,
          email: user.email,
          tenant_id: tenantId || null,
        });
      if (profileErr) {
        console.error("Error creating profile:", profileErr);
      }
    }

    // Create role if missing
    if (!existingRole) {
      const { error: roleErr } = await adminClient
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: role,
          tenant_id: tenantId || null,
        });
      if (roleErr) {
        console.error("Error creating role:", roleErr);
      }
    }

    // Handle affiliate record
    if (role === "affiliate") {
      const { data: existingAffiliate } = await adminClient
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAffiliate) {
        const name = user.user_metadata?.name || user.email?.split("@")[0] || "user";
        const refCode = name.toLowerCase().replace(/[^a-z0-9]/g, "") +
          Math.random().toString(36).substring(2, 8);
        await adminClient.from("affiliates").insert({
          user_id: user.id,
          ref_code: refCode,
          commission_percent: 10,
        });
      }
    }

    // Fetch final role
    const { data: finalRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({ 
        provisioned: true, 
        role: finalRole?.role || role,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Provision error:", err);
    return new Response(JSON.stringify({ error: "Erro interno: " + (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
