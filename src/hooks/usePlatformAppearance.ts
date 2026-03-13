import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const APPEARANCE_KEYS = [
  "appearance_primary_button",
  "appearance_secondary_button",
  "appearance_link_color",
  "appearance_main_color",
];

const CSS_VAR_MAP: Record<string, string> = {
  appearance_primary_button: "--platform-primary-btn",
  appearance_secondary_button: "--platform-secondary-btn",
  appearance_link_color: "--platform-link-color",
  appearance_main_color: "--platform-main-color",
};

export function usePlatformAppearance() {
  const { data: colors } = useQuery({
    queryKey: ["platform-appearance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", APPEARANCE_KEYS);
      const map: Record<string, string> = {};
      data?.forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  useEffect(() => {
    if (!colors) return;
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      if (colors[key]) {
        root.style.setProperty(cssVar, colors[key]);
      } else {
        root.style.removeProperty(cssVar);
      }
    }
  }, [colors]);

  return colors || {};
}
