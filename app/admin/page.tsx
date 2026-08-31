"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getRealBarbers, SERVICES, formatPrice, totalsForServices } from "@/lib/catalog";
import { formatItalianDate, getFirstBookableDate } from "@/lib/availability";
import { SITE } from "@/lib/site-config";

type AdminAppt = {
  id: string; status: string; barberId: string; barberName: string; serviceNames: string;
  firstName: string; lastName: string; timeLabel: string; durationMin: number; priceCents: number; isWalkIn: boolean;
};
type Agenda = { date: string; weekStart: string; appointments: AdminAppt[]; takings: { dayCents: number; weekCents: number } };
const euro = (c: number) => `${(c / 100).toLocaleString("it-IT")} €`;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<"unknown" | "needed" | "ok">("unknown");
  const [error, setError] = useState("");
  const [date, setDate] = useState(getFirstBookableDate());
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [walkOpen, setWalkOpen] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/admin/appointments?date=${date}`);
    if (res.status === 401) { setAuth("needed"); return; }
    const json = (await res.json()) as Agenda & { error?: string };
    if (!res.ok) { setError(json.error || "Impossibile caricare l'agenda."); setAuth("ok"); return; }
    setAgenda(json); setAuth("ok");
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) { setError(json.error || "Accesso negato."); return; }
    setAuth("ok"); void load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    if (res.ok) void load();
  }

  if (auth === "unknown") return <main className="admin-shell"><p className="slot-status">Caricamento…</p></main>;
  if (auth === "needed") {
    return (
      <main className="admin-shell">
        <form className="admin-login" onSubmit={onLogin}>
          <p className="eyebrow">{SITE.brand}</p>
          <h1 className="font-serif">Area admin</h1>
          <input className="input-lux" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="field-error">{error}</p> : null}
          <button type="submit" className="btn btn-gold">Entra</button>
        </form>
      </main>
    );
  }

  const byBarber = (id: string) => (agenda?.appointments || []).filter((a) => a.barberId === id);

  return (
    <main className="admin-shell">
      <header className="admin-head">
        <div><p className="eyebrow">Agenda</p><h1 className="font-serif">{SITE.name}</h1></div>
        <div className="admin-head-actions">
          <input className="input-lux" type="date" value={date} min={SITE.openingDate} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="btn btn-gold" onClick={() => setWalkOpen(true)}>Inserisci Walk-in</button>
          <button type="button" className="btn btn-outline" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuth("needed"); }}>Esci</button>
        </div>
      </header>
      {error ? <p className="field-error">{error}</p> : null}
      <section className="takings">
        <article><span>Incasso giorno</span><strong>{euro(agenda?.takings.dayCents || 0)}</strong><small>{formatItalianDate(date)}</small></article>
        <article><span>Incasso settimana</span><strong>{euro(agenda?.takings.weekCents || 0)}</strong><small>da lunedì {agenda?.weekStart}</small></article>
      </section>
      <section className="agenda-columns">
        {getRealBarbers().map((b) => (
          <div key={b.id} className="agenda-col">
            <h2 className="font-serif">{b.name}</h2>
            {byBarber(b.id).length === 0 ? <p className="slot-status">Nessun appuntamento</p> : byBarber(b.id).map((a) => (
              <article key={a.id} className={`agenda-card status-${a.status}`}>
                <header><strong>{a.timeLabel}</strong><span>{a.durationMin} min</span></header>
                <p>{a.serviceNames}</p>
                <p>{a.firstName} {a.lastName}{a.isWalkIn ? " · Walk-in" : ""}</p>
                <p className="agenda-price">{euro(a.priceCents)}</p>
                {a.status !== "cancelled" ? (
                  <div className="agenda-actions">
                    <button type="button" onClick={() => void patch(a.id, { status: "completed" })}>Completato</button>
                    <button type="button" onClick={() => void patch(a.id, { status: "cancelled" })}>Annulla</button>
                  </div>
                ) : <p className="field-error">Annullato</p>}
              </article>
            ))}
          </div>
        ))}
      </section>
      {walkOpen ? <WalkInModal date={date} onClose={() => setWalkOpen(false)} onSaved={() => { setWalkOpen(false); void load(); }} /> : null}
    </main>
  );
}

function WalkInModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const [serviceIds, setServiceIds] = useState<string[]>(["taglio-standard"]);
  const [barberId, setBarberId] = useState("felice");
  const [startTime, setStartTime] = useState("09:30");
  const [firstName, setFirstName] = useState("Walk-in");
  const [priceEuro, setPriceEuro] = useState(15);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totals = useMemo(() => totalsForServices(SERVICES.filter((s) => serviceIds.includes(s.id))), [serviceIds]);
  useEffect(() => { setPriceEuro(totals.priceEuro); }, [totals.priceEuro]);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/admin/walk-in", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds, barberId, date, startTime, firstName, priceEuro }),
    });
    const json = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) { setError(json.error || "Impossibile salvare."); return; }
    onSaved();
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <p className="eyebrow">Walk-in</p>
        <h2 className="font-serif">Inserisci in agenda</h2>
        <label>Barbiere
          <select className="input-lux" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            {getRealBarbers().map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label>Servizi
          <select className="input-lux" multiple value={serviceIds} onChange={(e) => setServiceIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatPrice(s)}</option>)}
          </select>
        </label>
        <label>Orario<input className="input-lux" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
        <label>Nome<input className="input-lux" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label>Prezzo effettivo (€)<input className="input-lux" type="number" min={0} value={priceEuro} onChange={(e) => setPriceEuro(Number(e.target.value))} /></label>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="admin-head-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Chiudi</button>
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Salvataggio…" : "Salva walk-in"}</button>
        </div>
      </form>
    </div>
  );
}
