import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight Supabase ping so free-tier projects stay warm.
 * Schedule: vercel.json crons → daily 03:00 UTC.
 *
 * Auth: if `CRON_SECRET` is set, require `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends this automatically). If unset, GET is allowed (local/dev).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { status: "ok", supabase: "skipped", reason: "not_configured" },
      { status: 200 },
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { status: "ok", supabase: "skipped", reason: "client_unavailable" },
      { status: 200 },
    );
  }

  // Equivalent to SELECT 1: head-only probe against a known table.
  const { error } = await db.from("appointments").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error("[cron/keep-alive] supabase probe failed", error.message);
    return NextResponse.json(
      { status: "error", message: "Supabase probe failed." },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
