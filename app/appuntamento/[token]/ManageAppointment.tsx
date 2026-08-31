"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CANCEL_HOURS_BEFORE, SITE } from "@/lib/site-config";
import { icsDataUri } from "@/lib/ics";

type Appointment = {
  status: string;
  firstName: string;
  lastName: string;
  barberName: string;
  serviceNames: string;
  durationMinutes: number;
  totalPrice: number;
  dateLabel: string;
  timeLabel: string;
  cancelledAt: string | null;
  ics?: string;
  slotFreed?: boolean;
  reminderCancelled?: boolean;
};

export function ManageAppointment({ token }: { token: string }) {
  const [data, setData] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/${token}`);
        const json = (await res.json()) as Appointment & { error?: string };
        if (!alive) return;
        if (!res.ok) {
          setError(json.error || "Appuntamento non trovato.");
          return;
        }
        setData(json);
      } catch {
        if (alive) setError("Impossibile caricare l'appuntamento.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  async function cancel() {
    if (!confirm("Vuoi davvero disdire questo appuntamento? Lo slot tornerà libero.")) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${token}`, { method: "DELETE" });
      const json = (await res.json()) as Appointment & { error?: string };
      if (!res.ok) {
        setError(json.error || "Annullamento non riuscito.");
        return;
      }
      setData(json);
    } catch {
      setError("Annullamento non riuscito.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="slot-status">Caricamento…</p>;
  }
  if (error && !data) {
    return (
      <div className="manage-card">
        <h1 className="section-title font-serif">Appuntamento</h1>
        <p className="field-error">{error}</p>
        <p>
          <Link href="/#prenota" className="contact-link">
            Prenota di nuovo
          </Link>
        </p>
      </div>
    );
  }
  if (!data) return null;

  const cancelled = data.status === "cancelled";
  const icsHref = `/api/bookings/${token}?ics=1`;

  return (
    <div className="manage-card">
      <p className="eyebrow">{cancelled ? "Annullata" : "Confermata"}</p>
      <h1 className="section-title font-serif">Il tuo appuntamento</h1>
      <ul className="summary-list" style={{ marginTop: "1.5rem" }}>
        <li>
          Servizio <strong>{data.serviceNames}</strong>
        </li>
        <li>
          Barbiere <strong>{data.barberName}</strong>
        </li>
        <li>
          Quando{" "}
          <strong>
            {data.dateLabel} · {data.timeLabel}
          </strong>
        </li>
        <li>
          Durata <strong>{data.durationMinutes} min</strong>
        </li>
        <li>
          Totale <strong>€ {data.totalPrice}</strong>
        </li>
        <li>
          Cliente{" "}
          <strong>
            {data.firstName} {data.lastName}
          </strong>
        </li>
      </ul>
      {error ? <p className="field-error">{error}</p> : null}
      {!cancelled ? (
        <>
          <p className="booking-open-note" style={{ marginTop: "1.25rem" }}>
            Puoi disdire gratuitamente fino a {CANCEL_HOURS_BEFORE} ore prima.
            Lo slot si libera e il promemoria di 30 minuti non parte. Oltre tale
            termine chiama il {SITE.phone}.
          </p>
          <div className="success-actions" style={{ justifyContent: "stretch" }}>
            <a className="btn btn-outline btn-magnetic" href={icsHref}>
              Scarica .ics (promemoria 30 min)
            </a>
            <button
              type="button"
              className="btn btn-outline btn-danger"
              disabled={cancelling}
              onClick={() => void cancel()}
            >
              {cancelling ? "Annullamento…" : "Disdici appuntamento"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="booking-open-note" style={{ marginTop: "1.25rem" }}>
            Prenotazione annullata. Lo slot è di nuovo libero: il promemoria di
            30 minuti non parte. Apri il file .ics di disdetta per togliere
            l&apos;evento dal calendario.
          </p>
          {data.ics ? (
            <a className="btn btn-outline btn-magnetic" href={icsDataUri(data.ics)} download>
              Rimuovi dal calendario
            </a>
          ) : (
            <a className="btn btn-outline btn-magnetic" href={icsHref}>
              Rimuovi dal calendario
            </a>
          )}
        </>
      )}
      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/#prenota" className="contact-link">
          Prenota un nuovo orario
        </Link>
        {" · "}
        <Link href="/terms" className="contact-link">
          Termini e disdetta
        </Link>
      </p>
    </div>
  );
}
