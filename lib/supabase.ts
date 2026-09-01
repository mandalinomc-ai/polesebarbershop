import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./site-config";

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

export function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
}

/** JWT service_role or new sb_secret_… secret key. */
export function getSupabaseSecretKey() {
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  ).trim();
  return key || "";
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const SUPABASE_MISSING_IT =
  `Database non configurato. La prenotazione non è stata salvata. Chiama il salone al ${SITE.phone}.`;
