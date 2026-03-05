import { supabase } from "@/integrations/supabase/client";

// Types for our database tables
export interface DbService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  icon: string;
  active: boolean;
  image_url: string | null;
  tenant_id: string | null;
}

export interface DbBarber {
  id: string;
  user_id: string | null;
  name: string;
  specialty: string | null;
  active: boolean;
  photo_url: string | null;
  tenant_id: string | null;
}

export interface DbAvailability {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  tenant_id: string | null;
}

export interface DbAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  client_user_id: string | null;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: "pendente" | "confirmado" | "cancelado" | "concluido";
  price: number;
  created_at: string;
  tenant_id: string | null;
  barbers?: { name: string };
  services?: { name: string };
}

export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  active: boolean;
  image_url: string | null;
  tenant_id: string | null;
}

export interface DbBlockedDate {
  id: string;
  blocked_date: string | null;
  reason: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  barber_id: string | null;
  tenant_id: string | null;
}

// SECURITY: All fetch functions require tenantId for multi-tenant isolation
export async function fetchServices(tenantId?: string): Promise<DbService[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarbers(tenantId?: string): Promise<DbBarber[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarberAvailability(barberId: string): Promise<DbAvailability[]> {
  const { data, error } = await supabase
    .from("barber_availability")
    .select("*")
    .eq("barber_id", barberId)
    .eq("active", true)
    .order("day_of_week");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchAllAvailability(tenantId?: string): Promise<DbAvailability[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("barber_availability")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (error) throw error;
  return (data as any) || [];
}

// SECURITY: Appointments query does NOT return client_phone for privacy
// Admin queries use a separate select with full fields
export async function fetchAppointments(barberId?: string, tenantId?: string): Promise<DbAppointment[]> {
  if (!tenantId) return [];
  let query = supabase
    .from("appointments")
    .select("id, client_name, client_user_id, barber_id, service_id, appointment_date, appointment_time, status, price, created_at, tenant_id, barbers(name), services(name)")
    .eq("tenant_id", tenantId)
    .order("appointment_date", { ascending: false });
  if (barberId) query = query.eq("barber_id", barberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

// Admin-only: includes client_phone for internal use
export async function fetchAppointmentsAdmin(barberId?: string, tenantId?: string): Promise<DbAppointment[]> {
  if (!tenantId) return [];
  let query = supabase
    .from("appointments")
    .select("*, barbers(name), services(name)")
    .eq("tenant_id", tenantId)
    .order("appointment_date", { ascending: false });
  if (barberId) query = query.eq("barber_id", barberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarberByUserId(userId: string): Promise<DbBarber | null> {
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

export async function fetchBlockedDates(tenantId?: string): Promise<DbBlockedDate[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("blocked_date");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchProducts(tenantId?: string): Promise<DbProduct[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBookedSlots(barberId: string, date: string): Promise<{ time: string; duration: number }[]> {
  const { data, error } = await supabase
    .rpc("check_appointment_availability", {
      _barber_id: barberId,
      _date: date,
    });
  if (error) throw error;
  return ((data as any) || []).map((a: any) => ({
    time: (a.appointment_time as string)?.slice(0, 5),
    duration: a.duration_minutes || 30,
  }));
}

export async function createAppointment(data: {
  client_name: string;
  client_phone: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  tenant_id?: string;
  email_cliente?: string;
}): Promise<string> {
  if (!data.tenant_id) {
    throw new Error("Tenant não identificado para o agendamento.");
  }
  const id = crypto.randomUUID();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-appointment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ ...data, id }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || "Erro ao criar agendamento.");
  }
  return id;
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Services
export async function createService(data: Omit<DbService, "id">) {
  if (!data.tenant_id) throw new Error("tenant_id obrigatório");
  const { error } = await supabase.from("services").insert(data as any);
  if (error) throw error;
}

export async function updateService(id: string, data: Partial<DbService>) {
  const { error } = await supabase.from("services").update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Barbers
export async function createBarber(data: { name: string; specialty?: string; tenant_id?: string }) {
  if (!data.tenant_id) throw new Error("tenant_id obrigatório");
  const { error } = await supabase.from("barbers").insert(data as any);
  if (error) throw error;
}

export async function updateBarber(id: string, data: Partial<DbBarber>) {
  const { error } = await supabase.from("barbers").update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteBarber(id: string) {
  const { error } = await supabase.from("barbers").delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Barber Availability
export async function upsertAvailability(data: { barber_id: string; day_of_week: number; start_time: string; end_time: string; active: boolean; tenant_id?: string }[]) {
  for (const item of data) {
    const { data: existing } = await supabase.from("barber_availability").select("id").eq("barber_id", item.barber_id).eq("day_of_week", item.day_of_week).maybeSingle();
    if (existing) {
      await supabase.from("barber_availability").update({ start_time: item.start_time, end_time: item.end_time, active: item.active } as any).eq("id", (existing as any).id);
    } else if (item.active) {
      await supabase.from("barber_availability").insert(item as any);
    }
  }
}

// CRUD: Products
export async function createProduct(data: Omit<DbProduct, "id">) {
  if (!data.tenant_id) throw new Error("tenant_id obrigatório");
  const { error } = await supabase.from("products").insert(data as any);
  if (error) throw error;
}

export async function updateProduct(id: string, data: Partial<DbProduct>) {
  const { error } = await supabase.from("products").update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// Fetch all services (including inactive) for admin
export async function fetchAllServices(tenantId?: string): Promise<DbService[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return (data as any) || [];
}

// Fetch all barbers (including inactive) for admin
export async function fetchAllBarbers(tenantId?: string): Promise<DbBarber[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return (data as any) || [];
}

export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }
  return slots;
}

export async function fetchAdminPhone(tenantId?: string): Promise<string | null> {
  if (!tenantId) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "phone")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).value;
}
