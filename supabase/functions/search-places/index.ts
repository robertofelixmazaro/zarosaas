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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Get affiliate
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: affiliate, error: affError } = await supabaseAdmin
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (affError || !affiliate) {
      return new Response(
        JSON.stringify({ error: "Affiliate not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check daily limit (20 searches/day, midnight BRT reset)
    const now = new Date();
    // Get start of today in BRT (UTC-3)
    const brtOffset = -3 * 60;
    const brtNow = new Date(now.getTime() + brtOffset * 60 * 1000);
    const todayStart = new Date(
      Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate())
    );
    // Convert back to UTC
    const todayStartUTC = new Date(todayStart.getTime() - brtOffset * 60 * 1000);

    const { count, error: countError } = await supabaseAdmin
      .from("affiliate_searches")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .gte("created_at", todayStartUTC.toISOString());

    if (countError) {
      return new Response(
        JSON.stringify({ error: "Error checking search limit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((count ?? 0) >= 20) {
      return new Response(
        JSON.stringify({
          error: "Você atingiu o limite diário de buscas. Volte amanhã.",
          limit_reached: true,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { city, type } = await req.json();

    if (!city || !type) {
      return new Response(
        JSON.stringify({ error: "City and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (city.length > 100 || type.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid input length" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Google Places Text Search
    const query = encodeURIComponent(`${type} em ${city}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=pt-BR&key=${googleApiKey}`;

    const placesRes = await fetch(url);
    const placesData = await placesRes.json();

    if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
      console.error("Google Places error:", placesData.status, placesData.error_message);
      return new Response(
        JSON.stringify({ error: "Erro na busca do Google Places" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = (placesData.results || []).slice(0, 20);

    // Get details for phone/website
    const detailedResults = await Promise.all(
      results.map(async (place: any) => {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,url&language=pt-BR&key=${googleApiKey}`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          const d = detailData.result || {};
          return {
            name: d.name || place.name,
            address: d.formatted_address || place.formatted_address,
            phone: d.formatted_phone_number || null,
            website: d.website || null,
            maps_url: d.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          };
        } catch {
          return {
            name: place.name,
            address: place.formatted_address,
            phone: null,
            website: null,
            maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          };
        }
      })
    );

    // Record the search
    await supabaseAdmin.from("affiliate_searches").insert({
      affiliate_id: affiliate.id,
      search_query: type.substring(0, 100),
      search_city: city.substring(0, 100),
      results_count: detailedResults.length,
    });

    const remainingSearches = 20 - ((count ?? 0) + 1);

    return new Response(
      JSON.stringify({
        results: detailedResults,
        remaining_searches: Math.max(0, remainingSearches),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-places error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
