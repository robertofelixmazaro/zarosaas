import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { barber_id, email, password } = await req.json();

    if (!barber_id || !email || !password) {
      return new Response(JSON.stringify({ error: "barber_id, email e password são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("auth_id", caller.id)
      .single();

    if (!callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant do chamador não encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: barber } = await adminClient
      .from("barbers")
      .select("user_id, name, tenant_id")
      .eq("id", barber_id)
      .single();

    if (!barber) {
      return new Response(JSON.stringify({ error: "Profissional não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (barber.tenant_id !== callerProfile.tenant_id) {
      return new Response(JSON.stringify({ error: "Sem permissão para gerenciar este profissional" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const syncStaffAccess = async (userId: string) => {
      const metadata = {
        name: barber.name,
        tenant_id: callerProfile.tenant_id,
        account_type: "staff",
      };

      const { error: profileReadError, data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("auth_id", userId)
        .maybeSingle();

      if (profileReadError) throw profileReadError;

      if (existingProfile) {
        const { error: profileUpdateError } = await adminClient
          .from("profiles")
          .update({
            name: barber.name,
            email,
            tenant_id: callerProfile.tenant_id,
          })
          .eq("auth_id", userId);

        if (profileUpdateError) throw profileUpdateError;
      } else {
        const { error: profileInsertError } = await adminClient.from("profiles").insert({
          auth_id: userId,
          name: barber.name,
          email,
          tenant_id: callerProfile.tenant_id,
        });

        if (profileInsertError) throw profileInsertError;
      }

      const { error: roleDeleteError } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (roleDeleteError) throw roleDeleteError;

      const { error: roleInsertError } = await adminClient.from("user_roles").insert({
        user_id: userId,
        role: "staff",
        tenant_id: callerProfile.tenant_id,
      });
      if (roleInsertError) throw roleInsertError;

      return metadata;
    };

    let staffUserId = barber.user_id;

    if (staffUserId) {
      // Prevent hijacking an account that is not a staff account of this tenant
      const { data: existingRoles } = await adminClient
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", staffUserId);

      const hijackRisk = (existingRoles || []).some(
        (r: any) =>
          r.role === "super_admin" ||
          r.role === "affiliate" ||
          (r.tenant_id && r.tenant_id !== callerProfile.tenant_id)
      );

      if (hijackRisk) {
        return new Response(JSON.stringify({ error: "Esta conta não pode ser gerenciada por este painel." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metadata = await syncStaffAccess(staffUserId);
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(staffUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar credenciais." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: barber.name,
          tenant_id: callerProfile.tenant_id,
          account_type: "staff",
        },
      });

      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Erro ao criar usuário." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      staffUserId = newUser.user.id;
      await syncStaffAccess(staffUserId);

      const { error: barberUpdateError } = await adminClient
        .from("barbers")
        .update({ user_id: staffUserId })
        .eq("id", barber_id);

      if (barberUpdateError) throw barberUpdateError;
    }

    return new Response(JSON.stringify({ success: true, role: "staff", message: "Acesso de colaborador salvo com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Internal error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
