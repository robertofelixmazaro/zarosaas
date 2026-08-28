import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only tenant admins / super admins may use this connectivity tester
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const body = await req.json();
    const { action, api_url, api_key, instance_id, phone, message } = body;

    if (!api_url || !api_key) {
      return new Response(JSON.stringify({ error: "URL da API e API Key são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = api_url.replace(/\/+$/, "");

    if (action === "check_connection") {
      // Test connection state
      const url = `${baseUrl}/instance/connectionState/${instance_id || ""}`;
      const res = await fetch(url, {
        headers: { apikey: api_key },
      });

      const responseText = await res.text();
      let responseData: any = null;
      try { responseData = JSON.parse(responseText); } catch { /* ignore */ }

      if (!res.ok) {
        let errorMsg = "Erro ao conectar na API";
        if (res.status === 401 || res.status === 403) {
          errorMsg = "Token/API Key inválido. Verifique suas credenciais.";
        } else if (res.status === 404) {
          errorMsg = "Instância não encontrada. Verifique o ID da instância.";
        }
        return new Response(JSON.stringify({
          success: false,
          error: errorMsg,
          status_code: res.status,
          api_response: responseText.slice(0, 300),
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const state = responseData?.instance?.state || responseData?.state || responseData?.status;
      const connected = state === "open" || state === "connected";

      return new Response(JSON.stringify({
        success: true,
        connected,
        state: state || "desconhecido",
        message: connected
          ? "WhatsApp conectado e pronto para enviar mensagens!"
          : `API respondeu, mas o estado é: ${state || "desconhecido"}. Verifique se o QR Code foi escaneado.`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_test") {
      if (!phone) {
        return new Response(JSON.stringify({ error: "Número de telefone é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize phone
      let digits = phone.replace(/\D/g, "");
      if (!digits) {
        return new Response(JSON.stringify({ error: "Número de telefone inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!digits.startsWith("55")) digits = "55" + digits;

      if (digits.length < 12 || digits.length > 13) {
        return new Response(JSON.stringify({
          error: `Número inválido (${digits.length} dígitos). Formato esperado: 5516999999999`,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testMsg = message || "✅ Mensagem de teste do Zaro Agendamentos. Se você recebeu, a integração está funcionando!";

      const sendUrl = `${baseUrl}/message/sendText/${instance_id || ""}`;
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: api_key,
        },
        body: JSON.stringify({
          number: digits,
          text: testMsg,
        }),
      });

      const responseText = await res.text();

      if (!res.ok) {
        let errorMsg = "Erro ao enviar mensagem";
        if (res.status === 401 || res.status === 403) {
          errorMsg = "Token inválido";
        } else if (res.status === 404) {
          errorMsg = "Instância não encontrada ou endpoint incorreto";
        } else if (res.status === 400) {
          errorMsg = "Instância não conectada ou número inválido";
        }

        return new Response(JSON.stringify({
          success: false,
          error: errorMsg,
          status_code: res.status,
          api_response: responseText.slice(0, 300),
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Mensagem enviada com sucesso para ${digits}!`,
        api_response: responseText.slice(0, 300),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'check_connection' ou 'send_test'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("test-whatsapp error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
