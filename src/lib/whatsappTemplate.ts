import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_APPOINTMENT_TEMPLATE =
  `Olá {cliente}\n\n` +
  `Seu agendamento foi confirmado.\n\n` +
  `Serviço: {servico}\n` +
  `Profissional: {profissional}\n` +
  `Data: {data}\n` +
  `Horário: {horario}\n` +
  `Valor: {valor}\n\n` +
  `Aguardamos você.`;

export const TEMPLATE_VARIABLES = [
  "{cliente}",
  "{servico}",
  "{profissional}",
  "{data}",
  "{horario}",
  "{valor}",
  "{empresa}",
  "{telefone_empresa}",
  "{endereco_cliente}",
];

export interface TemplateVars {
  cliente?: string;
  servico?: string;
  profissional?: string;
  data?: string;
  horario?: string;
  valor?: string;
  empresa?: string;
  telefone_empresa?: string;
  endereco_cliente?: string;
}
export function renderTemplate(template: string, vars: TemplateVars): string {
  let out = template || "";
  for (const [k, v] of Object.entries(vars)) {
    const value = v ?? "";
    // Support {var} and legacy {{var}}
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), value);
    out = out.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, "g"), value);
  }
  return out;
}

export async function loadAppointmentTemplate(tenantId: string): Promise<string> {
  const { data } = await supabase
    .from("site_settings" as any)
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "wa_appointment_template")
    .maybeSingle();
  const value = (data as any)?.value;
  return value && value.trim() ? value : DEFAULT_APPOINTMENT_TEMPLATE;
}
