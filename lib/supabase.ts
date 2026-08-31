import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppointmentRow = {
  id: string;
  status: string;
  manage_token: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  barber_id: string;
  service_ids: string[];
  service_names?: string;
  services_snapshot?: unknown;
  duration_minutes?: number;
  duration_min?: number;
  total_price?: number;
  price_cents?: number;
  starts_at: string;
  ends_at: string;
  reminder_sent_at?: string | null;
  qstash_message_id?: string | null;
  created_at: string;
  cancelled_at: string | null;
  is_walk_in?: boolean;
  notes?: string | null;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export const SUPABASE_MISSING_IT =
  "Prenotazioni temporaneamente non disponibili: manca la configurazione del database. Riprova più tardi o scrivici su WhatsApp.";
