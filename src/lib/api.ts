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

// Fetch functions - all accept tenantId for multi-tenant filtering
export async function fetchServices(tenantId?: string): Promise<DbService[]> {
  let query = supabase.from("services" as any).select("*").eq("active", true).order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarbers(tenantId?: string): Promise<DbBarber[]> {
  let query = supabase.from("barbers" as any).select("*").eq("active", true).order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarberAvailability(barberId: string): Promise<DbAvailability[]> {
  const { data, error } = await supabase
    .from("barber_availability" as any)
    .select("*")
    .eq("barber_id", barberId)
    .eq("active", true)
    .order("day_of_week");
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchAllAvailability(tenantId?: string): Promise<DbAvailability[]> {
  let query = supabase.from("barber_availability" as any).select("*").eq("active", true);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchAppointments(barberId?: string, tenantId?: string): Promise<DbAppointment[]> {
  let query = supabase
    .from("appointments" as any)
    .select("*, barbers(name), services(name)")
    .order("appointment_date", { ascending: false });
  if (barberId) query = query.eq("barber_id", barberId);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBarberByUserId(userId: string): Promise<DbBarber | null> {
  const { data, error } = await supabase
    .from("barbers" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

export async function fetchBlockedDates(tenantId?: string): Promise<DbBlockedDate[]> {
  let query = supabase.from("blocked_dates" as any).select("*").order("blocked_date");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchProducts(tenantId?: string): Promise<DbProduct[]> {
  let query = supabase.from("products" as any).select("*").order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBookedSlots(barberId: string, date: string): Promise<{ time: string; duration: number }[]> {
  const { data, error } = await supabase
    .from("appointments" as any)
    .select("appointment_time, services(duration_minutes)")
    .eq("barber_id", barberId)
    .eq("appointment_date", date)
    .in("status", ["pendente", "confirmado"]);
  if (error) throw error;
  return ((data as any) || []).map((a: any) => ({
    time: a.appointment_time?.slice(0, 5),
    duration: a.services?.duration_minutes || 30,
  }));
}

export async function createAppointment(data: {
  client_name: string;
  client_phone: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  price: number;
  tenant_id?: string;
}): Promise<string> {
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
    .from("appointments" as any)
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments" as any).delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Services
export async function createService(data: Omit<DbService, "id">) {
  const { error } = await supabase.from("services" as any).insert(data as any);
  if (error) throw error;
}

export async function updateService(id: string, data: Partial<DbService>) {
  const { error } = await supabase.from("services" as any).update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services" as any).delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Barbers
export async function createBarber(data: { name: string; specialty?: string; tenant_id?: string }) {
  const { error } = await supabase.from("barbers" as any).insert(data as any);
  if (error) throw error;
}

export async function updateBarber(id: string, data: Partial<DbBarber>) {
  const { error } = await supabase.from("barbers" as any).update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteBarber(id: string) {
  const { error } = await supabase.from("barbers" as any).delete().eq("id", id);
  if (error) throw error;
}

// CRUD: Barber Availability
export async function upsertAvailability(data: { barber_id: string; day_of_week: number; start_time: string; end_time: string; active: boolean; tenant_id?: string }[]) {
  for (const item of data) {
    const { data: existing } = await supabase.from("barber_availability" as any).select("id").eq("barber_id", item.barber_id).eq("day_of_week", item.day_of_week).maybeSingle();
    if (existing) {
      await supabase.from("barber_availability" as any).update({ start_time: item.start_time, end_time: item.end_time, active: item.active } as any).eq("id", (existing as any).id);
    } else if (item.active) {
      await supabase.from("barber_availability" as any).insert(item as any);
    }
  }
}

// CRUD: Products
export async function createProduct(data: Omit<DbProduct, "id">) {
  const { error } = await supabase.from("products" as any).insert(data as any);
  if (error) throw error;
}

export async function updateProduct(id: string, data: Partial<DbProduct>) {
  const { error } = await supabase.from("products" as any).update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products" as any).delete().eq("id", id);
  if (error) throw error;
}

// Fetch all services (including inactive) for admin
export async function fetchAllServices(tenantId?: string): Promise<DbService[]> {
  let query = supabase.from("services" as any).select("*").order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as any) || [];
}

// Fetch all barbers (including inactive) for admin
export async function fetchAllBarbers(tenantId?: string): Promise<DbBarber[]> {
  let query = supabase.from("barbers" as any).select("*").order("name");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
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
  let query = supabase.from("site_settings" as any).select("value").eq("key", "phone");
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return (data as any).value;
}
