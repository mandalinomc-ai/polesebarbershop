"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { setRuntimeBarbersOverlay, SHOP_HOURS, type Barber } from "@/lib/catalog";

type StaffRow = { id: string; name: string; title: string; active: boolean };

function toOverlay(rows: StaffRow[]): Barber[] {
  const real: Barber[] = rows
    .filter((r) => r.active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      virtual: false,
      hours: SHOP_HOURS,
      active: true,
    }));
  return [
    ...real,
    {
      id: "anyone",
      name: "Felice",
      title: "Poltrona di Felice",
      virtual: true,
      hours: SHOP_HOURS,
      active: true,
    },
  ];
}

/** Aggiungi / gestisci dipendenti: entrano in prenotazione, agenda, stats e storico. */
export function TeamAdminPanel() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/barbers", { cache: "no-store" });
      const json = (await res.json()) as { barbers?: StaffRow[]; error?: string };
      if (!res.ok) {
        setError(json.error || "Impossibile caricare il team.");
        return;
      }
      const list = json.barbers || [];
      setRows(list);
      setRuntimeBarbersOverlay(toOverlay(list));
    } catch {
      setError("Impossibile caricare il team.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/admin/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { error?: string; barber?: StaffRow };
      if (!res.ok) {
        setError(json.error || "Salvataggio fallito.");
        return;
      }
      setName("");
      setOkMsg(`${json.barber?.name || "Dipendente"} aggiunto: compare in prenotazione e nelle stats.`);
      await load();
    } catch {
      setError("Salvataggio fallito.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: StaffRow) {
    if (row.id === "felice") return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/barbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, active: !row.active }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Aggiornamento fallito.");
        return;
      }
      await load();
    } catch {
      setError("Aggiornamento fallito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-stack">
      <section className="crm-card">
        <h2 className="font-serif">Team</h2>
        <p className="crm-confirm-lead">
          Aggiungi un dipendente: dal momento del salvataggio compare tra i barbieri
          selezionabili sul sito, in agenda, nelle statistiche e nello storico.
        </p>
        <form className="crm-inline-form" onSubmit={onAdd}>
          <label>
            Nome dipendente
            <input
              className="input-lux"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Marco"
              maxLength={60}
              required
            />
          </label>
          <button type="submit" className="btn btn-dark" disabled={busy || name.trim().length < 2}>
            {busy ? "Salvataggio…" : "Aggiungi"}
          </button>
        </form>
        {error ? <p className="field-error">{error}</p> : null}
        {okMsg ? <p className="booking-open-note">{okMsg}</p> : null}
      </section>
      <section className="crm-card">
        <h3 className="font-serif">Dipendenti</h3>
        <ul className="crm-confirm-list">
          {rows.map((r) => (
            <li key={r.id} className="crm-confirm-item">
              <div className="crm-confirm-main">
                <strong>{r.name}</strong>
                <span className="crm-confirm-svc">{r.title || r.id}</span>
                <span className="crm-confirm-when">{r.active ? "Attivo sul sito" : "Nascosto dal sito"}</span>
              </div>
              {r.id !== "felice" ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void toggleActive(r)}
                >
                  {r.active ? "Nascondi" : "Riattiva"}
                </button>
              ) : (
                <span className="booking-open-note">Titolare</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
