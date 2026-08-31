import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "walk_in";

export type AppointmentRow = {
  id: string;
  status: AppointmentStatus;
  manage_token: string;
  barber_id: string;
  service_ids: string[];
  services_snapshot: unknown;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  gdpr_consent_at: string | null;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  price_cents: number;
  is_walk_in: boolean;
  notes: string | null;
  source: "online" | "walk_in" | "admin";
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const SUPABASE_MISSING_IT =
  "Database non configurato. La prenotazione non è stata salvata. Chiama il salone al +39 327 015 6225.";
