"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ServiceCategory } from "@/lib/catalog";
import { SERVICE_CATEGORY_LABEL } from "@/lib/catalog";

type AdminService = {
  id: string;
  name: string;
  category: ServiceCategory;
  priceEuro: number;
  priceMaxEuro: number | null;
  isVariablePrice: boolean;
  durationMin: number;
  durationKnown: boolean;
  active: boolean;
  description: string;
  priceLabel: string;
  durationLabel: string;
};

/** Gestionale listino editor — duration / price / active. Booking APIs read the same DB overlays. */
export function ServicesAdminPanel() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { durationMin: string; priceEuro: string; priceMaxEuro: string; active: boolean }>
  >({});

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/services");
      const json = (await res.json()) as { error?: string; services?: AdminService[] };
      if (!res.ok) {
        setError(json.error || "Impossibile caricare i servizi.");
        return;
      }
      const list = json.services || [];
      setServices(list);
      const next: typeof drafts = {};
      for (const s of list) {
        next[s.id] = {
          durationMin: String(s.durationMin),
          priceEuro: String(s.priceEuro),
          priceMaxEuro: s.priceMaxEuro != null ? String(s.priceMaxEuro) : "",
          active: s.active,
        };
      }
      setDrafts(next);
    } catch {
      setError("Connessione non disponibile.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: FormEvent, id: string) {
    e.preventDefault();
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          durationMin: Number(d.durationMin),
          priceEuro: Number(d.priceEuro),
          priceMaxEuro: d.priceMaxEuro === "" ? null : Number(d.priceMaxEuro),
          active: d.active,
        }),
      });
      const json = (await res.json()) as { error?: string; service?: AdminService };
      if (!res.ok) {
        setError(json.error || "Salvataggio non riuscito.");
        return;
      }
      if (json.service) {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...json.service! } : s)));
      }
    } catch {
      setError("Connessione non disponibile.");
    } finally {
      setSavingId(null);
    }
  }

  const categories: ServiceCategory[] = ["capelli", "barba", "colore"];

  return (
    <section className="crm-services-admin">
      <p className="crm-note">
        Durata e prezzo usati da prenotazioni e slot. Le modifiche si applicano subito (catalogo + database).
        La durata pubblica è etichettata come &quot;Durata prevista&quot;.
      </p>
      {error ? <p className="field-error">{error}</p> : null}
      {categories.map((cat) => (
        <div key={cat} className="crm-services-group">
          <h3 className="font-serif">{SERVICE_CATEGORY_LABEL[cat]}</h3>
          <ul className="crm-services-list">
            {services
              .filter((s) => s.category === cat)
              .map((s) => {
                const d = drafts[s.id] || {
                  durationMin: String(s.durationMin),
                  priceEuro: String(s.priceEuro),
                  priceMaxEuro: s.priceMaxEuro != null ? String(s.priceMaxEuro) : "",
                  active: s.active,
                };
                return (
                  <li key={s.id}>
                    <form className="crm-service-row" onSubmit={(e) => save(e, s.id)}>
                      <div className="crm-service-meta">
                        <strong>{s.name}</strong>
                        <span className="meta">{s.id}</span>
                      </div>
                      <label>
                        Durata (min)
                        <input
                          className="input-lux"
                          type="number"
                          min={5}
                          max={480}
                          value={d.durationMin}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...d, durationMin: e.target.value },
                            }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Prezzo (€)
                        <input
                          className="input-lux"
                          type="number"
                          min={0}
                          max={500}
                          step={1}
                          value={d.priceEuro}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...d, priceEuro: e.target.value },
                            }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Max (€)
                        <input
                          className="input-lux"
                          type="number"
                          min={0}
                          max={500}
                          step={1}
                          value={d.priceMaxEuro}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...d, priceMaxEuro: e.target.value },
                            }))
                          }
                          placeholder="opz."
                        />
                      </label>
                      <label className="crm-service-active">
                        <input
                          type="checkbox"
                          checked={d.active}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...d, active: e.target.checked },
                            }))
                          }
                        />
                        Attivo
                      </label>
                      <button type="submit" className="btn btn-gold" disabled={savingId === s.id}>
                        {savingId === s.id ? "…" : "Salva"}
                      </button>
                    </form>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}
