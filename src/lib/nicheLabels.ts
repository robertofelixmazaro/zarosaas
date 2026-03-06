/**
 * Maps business niche to dynamic UI labels.
 * Used across the platform to adapt terminology per business type.
 */

export type BusinessNiche = "barbershop" | "salon" | "clinic" | "consulting" | "other";

interface NicheLabels {
  staffSingular: string;
  staffPlural: string;
  staffTitle: string;
}

const nicheMap: Record<BusinessNiche, NicheLabels> = {
  barbershop: { staffSingular: "Barbeiro", staffPlural: "Barbeiros", staffTitle: "Barbeiros" },
  salon: { staffSingular: "Profissional", staffPlural: "Profissionais", staffTitle: "Profissionais" },
  clinic: { staffSingular: "Especialista", staffPlural: "Especialistas", staffTitle: "Especialistas" },
  consulting: { staffSingular: "Consultor", staffPlural: "Consultores", staffTitle: "Consultores" },
  other: { staffSingular: "Profissional", staffPlural: "Equipe", staffTitle: "Equipe" },
};

export function getNicheLabels(niche?: string | null): NicheLabels {
  return nicheMap[(niche as BusinessNiche) || "other"] || nicheMap.other;
}
