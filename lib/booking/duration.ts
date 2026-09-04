import type { Service } from "@/lib/catalog";
import { clientDurationFromProcessing } from "./processing";

/**
 * How an effective duration was obtained.
 * Never invents minutes: override, known catalog, or configured processing only.
 */
export type DurationSource = "override" | "catalog" | "processing" | "none";

export type DurationKind = "fixed" | "variable" | "assisted" | "unknown";

export type EffectiveDurationResult = {
  ok: boolean;
  /** Occupancy service minutes (before buffer). Null when not determinable. */
  durationMin: number | null;
  source: DurationSource;
  kind: DurationKind;
  /** Safe for public online booking (no override inventing). */
  onlineBookable: boolean;
  /** Gestionale may proceed with Felice override. */
  allowsGestionaleOverride: boolean;
  reason?: string;
};

function kindForServices(services: Service[]): DurationKind {
  if (!services.length) return "unknown";
  // Price ranges (isVariablePrice) do not make duration unknown — official
  // catalog minutes are fixed and online-bookable when durationKnown.
  if (services.every((s) => s.durationKnown)) return "fixed";
  if (services.some((s) => s.isVariablePrice)) return "variable";
  return "unknown";
}

/**
 * Resolve effective service duration for occupancy.
 * Catalog listino is never mutated. No invented defaults.
 *
 * Priority:
 * 1. Positive durationOverrideMin (gestionale assisted)
 * 2. Configured processing timing on a single service (prep+process+finish)
 * 3. Sum of catalog durationMin when every service has durationKnown
 * 4. Otherwise not determinable → block online; gestionale needs override
 */
export function resolveEffectiveServiceDuration(input: {
  services: Service[];
  durationOverrideMin?: number | null;
  /** When true (gestionale), override alone is enough even if catalog unknown. */
  assisted?: boolean;
}): EffectiveDurationResult {
  const services = input.services || [];
  const kind = kindForServices(services);
  const allowsGestionaleOverride = true;

  if (!services.length) {
    return {
      ok: false,
      durationMin: null,
      source: "none",
      kind: "unknown",
      onlineBookable: false,
      allowsGestionaleOverride,
      reason: "Nessun servizio selezionato.",
    };
  }

  const override = input.durationOverrideMin;
  if (override != null && override > 0) {
    return {
      ok: true,
      durationMin: override,
      source: "override",
      kind: input.assisted || kind === "unknown" || kind === "variable" ? "assisted" : kind,
      onlineBookable: services.every((s) => s.durationKnown) && kind === "fixed",
      allowsGestionaleOverride,
    };
  }

  // Single service with explicit processing config (real durations only).
  if (services.length === 1) {
    const proc = clientDurationFromProcessing(services[0]!);
    if (proc != null && proc > 0) {
      return {
        ok: true,
        durationMin: proc,
        source: "processing",
        kind: services[0]!.durationKnown ? kind : "assisted",
        onlineBookable: Boolean(services[0]!.durationKnown && proc > 0),
        allowsGestionaleOverride,
      };
    }
  }

  const allKnown = services.every((s) => s.durationKnown);
  if (allKnown) {
    const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
    if (durationMin <= 0) {
      return {
        ok: false,
        durationMin: null,
        source: "none",
        kind,
        onlineBookable: false,
        allowsGestionaleOverride,
        reason: "Durata catalogo non valida.",
      };
    }
    return {
      ok: true,
      durationMin,
      source: "catalog",
      kind,
      onlineBookable: true,
      allowsGestionaleOverride,
    };
  }

  const unknownNames = services.filter((s) => !s.durationKnown).map((s) => s.name).join(", ");
  return {
    ok: false,
    durationMin: null,
    source: "none",
    kind,
    onlineBookable: false,
    allowsGestionaleOverride,
    reason: `Durata non determinabile per: ${unknownNames}. Imposta override in gestionale — nessuna durata inventata.`,
  };
}

/**
 * Thin wrapper kept for callers that already have a catalog sum + optional override.
 * Prefer resolveEffectiveServiceDuration when services are available.
 */
export function effectiveServiceDurationMin(
  catalogDurationMin: number,
  durationOverrideMin?: number | null,
): number {
  if (durationOverrideMin != null && durationOverrideMin > 0) {
    return durationOverrideMin;
  }
  return catalogDurationMin;
}
