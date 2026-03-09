import { supabase } from "@/integrations/supabase/client";

function parseBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";
  return "Outro";
}

function parseDevice(ua: string): string {
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
}

export async function recordLoginHistory(userId: string) {
  const ua = navigator.userAgent;
  let ip = null;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ip = data.ip;
  } catch {
    // IP capture is best-effort
  }

  await supabase.from("login_history").insert({
    user_id: userId,
    ip_address: ip,
    user_agent: ua,
    browser: parseBrowser(ua),
    device: parseDevice(ua),
  });
}
