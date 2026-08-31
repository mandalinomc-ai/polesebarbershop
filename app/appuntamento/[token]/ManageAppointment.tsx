"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    if (!confirm("Vuoi davvero disdire questo appuntamento?")) return;
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
        <button
          type="button"
          className="btn btn-outline btn-danger"
          style={{ marginTop: "1.5rem", width: "100%" }}
          disabled={cancelling}
          onClick={() => void cancel()}
        >
          {cancelling ? "Annullamento…" : "Disdici appuntamento"}
        </button>
      ) : (
        <p className="booking-open-note" style={{ marginTop: "1.25rem" }}>
          Prenotazione annullata.
        </p>
      )}
      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/#prenota" className="contact-link">
          Prenota un nuovo orario
        </Link>
      </p>
    </div>
  );
}
