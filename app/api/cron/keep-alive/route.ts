import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight Supabase ping so free-tier projects stay warm.
 * Schedule on the VPS (host cron or container), e.g. daily 03:00 UTC:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://felicepolesebarbershop.it/api/cron/keep-alive
 *
 * Auth: if `CRON_SECRET` is set, require `Authorization: Bearer <CRON_SECRET>`.
 * If unset, GET is allowed (local/dev).
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

  const { runNoBufferMaintenance } = await import("@/lib/strip-booking-buffer");
  const maintenance = await runNoBufferMaintenance();
  const { runSoloFeliceMigration } = await import("@/lib/solo-felice-migrate");
  const soloFelice = await runSoloFeliceMigration();

  return NextResponse.json({ status: "ok", maintenance, soloFelice }, { status: 200 });
}
