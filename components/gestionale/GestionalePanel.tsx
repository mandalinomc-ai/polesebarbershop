"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { getRealBarbers, SERVICES, formatPrice, totalsForServices } from "@/lib/catalog";
import { formatItalianDate, getFirstBookableDate } from "@/lib/availability";
import { SITE } from "@/lib/site-config";
import { SiteLogo } from "@/components/site/SiteImage";
import { formatEuroCents, type ClientRecord, type CrmStats } from "@/lib/crm";
import {
  NOTIFY_TEMPLATE_LABEL,
  WHATSAPP_MISSING_IT,
  buildNotifyCopy,
  waMeUrl,
  type NotifyTemplate,
} from "@/lib/crm-notify";

type Tab = "dashboard" | "agenda" | "clienti" | "statistiche" | "storico";

type AdminAppt = {
  id: string;
  status: string;
  barberId: string;
  barberName: string;
  serviceNames: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  timeLabel: string;
  durationMin: number;
  priceCents: number;
  isWalkIn: boolean;
  startsAt?: string;
};

type Agenda = {
  date: string;
  weekStart: string;
  appointments: AdminAppt[];
  takings: { dayCents: number; weekCents: number };
  warning?: string;
};

type HistoryAppt = {
  id: string;
  status: string;
  statusLabel: string;
  barberName: string;
  serviceNames: string;
  customerName: string;
  phone?: string;
  email?: string;
  startsAt: string;
  timeLabel: string;
  dateLabel: string;
  durationMin: number;
  priceCents: number;
  isWalkIn: boolean;
  notes?: string | null;
};

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clienti", label: "Clienti", icon: Users },
  { id: "statistiche", label: "Statistiche", icon: BarChart3 },
  { id: "storico", label: "Storico", icon: History },
];

const STATUS_IT: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "Annullato",
  walk_in: "Walk-in",
};

function pct(n: number) {
  return `${(n * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })} %`;
}

export function GestionalePanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<"unknown" | "needed" | "ok">("unknown");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [date, setDate] = useState(getFirstBookableDate());
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [crmWarning, setCrmWarning] = useState("");
  const [walkOpen, setWalkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [notifyFor, setNotifyFor] = useState<ClientRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [history, setHistory] = useState<HistoryAppt[]>([]);

  const loadAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/appointments?date=${date}`);
      if (res.status === 401) {
        setAuth("needed");
        return false;
      }
      const json = (await res.json()) as Agenda & { error?: string };
      if (!res.ok) {
        setError(json.error || "Impossibile caricare l'agenda.");
        setAuth((prev) => (prev === "unknown" ? "needed" : prev));
        return false;
      }
      setAgenda(json);
      setAuth("ok");
      if (json.warning) setCrmWarning(json.warning);
      return true;
    } catch {
      setError("Connessione non disponibile. Riprova.");
      setAuth((prev) => (prev === "ok" ? "ok" : "needed"));
      return false;
    }
  }, [date]);

  const loadCrm = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/crm?date=${date}`);
      if (res.status === 401) {
        setAuth("needed");
        return;
      }
      const json = (await res.json()) as {
        clients?: ClientRecord[];
        stats?: CrmStats;
        warning?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Impossibile caricare i clienti.");
        return;
      }
      setClients(json.clients || []);
      setStats(json.stats || null);
      if (json.warning) setCrmWarning(json.warning);
      else setCrmWarning("");
    } catch {
      setError("Connessione non disponibile. Riprova.");
    }
  }, [date]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/history");
      if (res.status === 401) {
        setAuth("needed");
        return;
      }
      const json = (await res.json()) as { appointments?: HistoryAppt[]; warning?: string };
      if (!res.ok) return;
      setHistory(json.appointments || []);
      if (json.warning) setCrmWarning(json.warning);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setError("");
    const ok = await loadAgenda();
    if (ok) {
      await loadCrm();
      await loadHistory();
    }
  }, [loadAgenda, loadCrm, loadHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Accesso negato.");
      return;
    }
    setAuth("ok");
    void load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) void load();
  }

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.email, c.services.map((s) => s.name).join(" ")].join(" ").toLowerCase().includes(q),
    );
  }, [clients, search]);

  if (auth === "unknown") {
    return (
      <main className="crm-login-wrap">
        <p className="slot-status">Caricamento…</p>
      </main>
    );
  }

  if (auth === "needed") {
    return (
      <main className="crm-login-wrap">
        <form className="crm-login" onSubmit={onLogin}>
          <p className="eyebrow">Gestionale</p>
          <h1 className="font-serif">{SITE.name}</h1>
          <p className="crm-login-sub">Pannello interno · Felice e Davide</p>
          <label>
            Utente
            <input
              className="input-lux"
              autoComplete="username"
              name="username"
              inputMode="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </label>
          <label>
            Password
            <input
              className="input-lux"
              type="password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
            />
          </label>
          {error ? <p className="field-error">{error}</p> : null}
          <button type="submit" className="btn btn-gold">
            Entra
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="crm-app">
      <aside className="crm-sidebar" aria-label="Gestionale">
        <div className="crm-brand">
          <SiteLogo alt="" className="crm-brand-logo" sizes="48px" />
          <div>
            <p className="eyebrow">Gestionale</p>
            <strong className="font-serif">{SITE.name}</strong>
          </div>
        </div>
        <nav>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                <Icon size={18} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          className="crm-logout"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            setAuth("needed");
          }}
        >
          <LogOut size={18} aria-hidden />
          Esci
        </button>
      </aside>

      <div className="crm-main">
        <header className="crm-top">
          <div>
            <p className="eyebrow">{TABS.find((t) => t.id === tab)?.label}</p>
            <h1 className="font-serif">{SITE.name}</h1>
          </div>
          <div className="crm-top-actions">
            <input
              className="input-lux"
              type="date"
              value={date}
              min={SITE.openingDate}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Data agenda"
            />
            <button type="button" className="btn btn-gold" onClick={() => setWalkOpen(true)}>
              <Plus size={16} aria-hidden /> Walk-in
            </button>
            <button
              type="button"
              className="btn btn-outline crm-mobile-logout"
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setAuth("needed");
              }}
            >
              <LogOut size={16} aria-hidden /> Esci
            </button>
          </div>
        </header>

        {error ? <p className="field-error">{error}</p> : null}
        {crmWarning ? <p className="crm-warning">{crmWarning}</p> : null}

        {tab === "dashboard" ? (
          <DashboardView
            stats={stats}
            clients={clients}
            date={date}
            onOpenClient={(c) => {
              setSelected(c);
              setTab("clienti");
            }}
          />
        ) : null}
        {tab === "agenda" ? (
          <AgendaView
            agenda={agenda}
            date={date}
            onPatch={patch}
            onNotify={(appt) => {
              const match =
                clients.find(
                  (c) =>
                    (appt.phone && c.phone && c.phone.replace(/\D/g, "") === appt.phone.replace(/\D/g, "")) ||
                    (appt.email && c.email && c.email.toLowerCase() === appt.email.toLowerCase()),
                ) ||
                ({
                  key: appt.id,
                  firstName: appt.firstName,
                  lastName: appt.lastName,
                  name: `${appt.firstName} ${appt.lastName}`.trim(),
                  phone: appt.phone || "",
                  email: appt.email || "",
                  visitCount: 1,
                  cancelledCount: appt.status === "cancelled" ? 1 : 0,
                  lastVisitAt: appt.startsAt || null,
                  lastVisitStatus: appt.status,
                  spendCents: appt.priceCents,
                  services: [],
                  history: [
                    {
                      id: appt.id,
                      startsAt: appt.startsAt || new Date().toISOString(),
                      status: appt.status,
                      cancelled: appt.status === "cancelled",
                      serviceNames: appt.serviceNames,
                      barberName: appt.barberName,
                      priceCents: appt.priceCents,
                      isWalkIn: appt.isWalkIn,
                    },
                  ],
                } satisfies ClientRecord);
              setNotifyFor(match);
            }}
          />
        ) : null}
        {tab === "clienti" ? (
          <ClientiView
            clients={filteredClients}
            search={search}
            onSearch={setSearch}
            selected={selected}
            onSelect={setSelected}
            onNotify={setNotifyFor}
            onBulk={() => setBulkOpen(true)}
            total={clients.length}
          />
        ) : null}
        {tab === "statistiche" ? <StatsView stats={stats} date={date} weekStart={agenda?.weekStart} /> : null}
        {tab === "storico" ? (
          <StoricoView
            history={history}
            onDelete={async (id) => {
              const res = await fetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
              if (res.status === 401) {
                setAuth("needed");
                return false;
              }
              if (!res.ok) {
                const json = (await res.json()) as { error?: string };
                setError(json.error || "Impossibile eliminare l'appuntamento.");
                return false;
              }
              setError("");
              await loadHistory();
              await loadCrm();
              await loadAgenda();
              return true;
            }}
          />
        ) : null}
      </div>

      <nav className="crm-bottom" aria-label="Sezioni gestionale">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <Icon size={18} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </nav>

      {walkOpen ? (
        <WalkInModal
          date={date}
          onClose={() => setWalkOpen(false)}
          onSaved={() => {
            setWalkOpen(false);
            void load();
          }}
        />
      ) : null}
      {notifyFor ? <NotifyModal client={notifyFor} onClose={() => setNotifyFor(null)} /> : null}
      {bulkOpen ? <BulkWhatsAppModal clients={filteredClients} onClose={() => setBulkOpen(false)} /> : null}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="crm-kpi">
      <span>{label}</span>
      <strong className="font-serif">{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function DashboardView({
  stats,
  clients,
  date,
  onOpenClient,
}: {
  stats: CrmStats | null;
  clients: ClientRecord[];
  date: string;
  onOpenClient: (c: ClientRecord) => void;
}) {
  const recent = clients.slice(0, 6);
  return (
    <div className="crm-stack">
      <section className="crm-kpis">
        <Kpi label="Clienti" value={String(stats?.totalClients ?? 0)} hint="Anagrafica da prenotazioni e walk-in" />
        <Kpi label="Visite" value={String(stats?.totalVisits ?? 0)} hint="Inclusi gli appuntamenti annullati" />
        <Kpi label="Incasso giorno" value={formatEuroCents(stats?.takings.dayCents || 0)} hint={formatItalianDate(date)} />
        <Kpi
          label="Incasso settimana"
          value={formatEuroCents(stats?.takings.weekCents || 0)}
          hint="Walk-in + prenotazioni confermate"
        />
        <Kpi
          label="Disdette / no-show"
          value={pct(stats?.cancelRate || 0)}
          hint={`${stats?.cancelledCount ?? 0} annullati su ${stats?.totalVisits ?? 0}`}
        />
        <Kpi
          label="Visite per cliente"
          value={(stats?.visitsPerClient || 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })}
        />
      </section>
      <div className="crm-split">
        <section className="crm-card">
          <h2 className="font-serif">Servizi più prenotati</h2>
          {stats?.mostFrequentServices.length ? (
            <ul className="crm-bars">
              {stats.mostFrequentServices.map((s) => {
                const max = stats.mostFrequentServices[0]?.count || 1;
                return (
                  <li key={s.id}>
                    <div>
                      <span>{s.name}</span>
                      <em>{s.count}</em>
                    </div>
                    <div className="crm-bar">
                      <span style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="slot-status">Nessun servizio ancora. Le prenotazioni compariranno qui.</p>
          )}
        </section>
        <section className="crm-card">
          <h2 className="font-serif">Clienti recenti</h2>
          {recent.length === 0 ? (
            <p className="slot-status">
              Anagrafica vuota. Prenotazioni online e walk-in riempiono nome, telefono, email, visite e spesa.
            </p>
          ) : (
            <ul className="crm-list">
              {recent.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => onOpenClient(c)}>
                    <strong>{c.name}</strong>
                    <span>
                      {c.visitCount} visite · {formatEuroCents(c.spendCents)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function AgendaView({
  agenda,
  date,
  onPatch,
  onNotify,
}: {
  agenda: Agenda | null;
  date: string;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onNotify: (a: AdminAppt) => void;
}) {
  const byBarber = (id: string) => (agenda?.appointments || []).filter((a) => a.barberId === id);
  return (
    <div className="crm-stack">
      <section className="takings">
        <article>
          <span>Incasso giorno</span>
          <strong>{formatEuroCents(agenda?.takings.dayCents || 0)}</strong>
          <small>{formatItalianDate(date)}</small>
        </article>
        <article>
          <span>Incasso settimana</span>
          <strong>{formatEuroCents(agenda?.takings.weekCents || 0)}</strong>
          <small>da lunedì {agenda?.weekStart}</small>
        </article>
      </section>
      <section className="agenda-columns">
        {getRealBarbers().map((b) => (
          <div key={b.id} className="agenda-col">
            <h2 className="font-serif">{b.name}</h2>
            {byBarber(b.id).length === 0 ? (
              <p className="slot-status">Nessun appuntamento</p>
            ) : (
              byBarber(b.id).map((a) => (
                <article key={a.id} className={`agenda-card status-${a.status}`}>
                  <header>
                    <strong>{a.timeLabel}</strong>
                    <span>{a.durationMin} min</span>
                  </header>
                  <p>{a.serviceNames}</p>
                  <p>
                    {a.firstName} {a.lastName}
                    {a.isWalkIn ? " · Walk-in" : ""}
                    {a.status === "cancelled" ? " · Annullato" : ""}
                  </p>
                  <p className="agenda-price">{formatEuroCents(a.priceCents)}</p>
                  {a.status === "cancelled" ? (
                    <p className="field-error">Annullato — resta in storico cliente</p>
                  ) : (
                    <div className="agenda-actions">
                      <button type="button" onClick={() => onPatch(a.id, { status: "completed" })}>
                        Completato
                      </button>
                      <button type="button" onClick={() => onPatch(a.id, { status: "cancelled" })}>
                        Annulla
                      </button>
                      <button type="button" onClick={() => onNotify(a)}>
                        Contatta
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ClientiView({
  clients,
  search,
  onSearch,
  selected,
  onSelect,
  onNotify,
  onBulk,
  total,
}: {
  clients: ClientRecord[];
  search: string;
  onSearch: (v: string) => void;
  selected: ClientRecord | null;
  onSelect: (c: ClientRecord | null) => void;
  onNotify: (c: ClientRecord) => void;
  onBulk: () => void;
  total: number;
}) {
  const open = selected && clients.find((c) => c.key === selected.key) ? selected : null;
  return (
    <div className="crm-stack">
      <div className="crm-toolbar">
        <label className="crm-search">
          <Search size={16} aria-hidden />
          <input
            className="input-lux"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cerca nome, telefono, email…"
          />
        </label>
        <button type="button" className="btn btn-outline" onClick={onBulk} disabled={clients.length === 0}>
          <MessageCircle size={16} aria-hidden /> WhatsApp massivo
        </button>
      </div>
      {total === 0 ? (
        <p className="slot-status">
          Nessun cliente in anagrafica. Le prenotazioni e i walk-in compariranno qui con servizi, visite, ultima visita e
          spesa. Gli appuntamenti annullati restano nello storico, contrassegnati.
        </p>
      ) : clients.length === 0 ? (
        <p className="slot-status">Nessun risultato per «{search}».</p>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Servizi</th>
                <th>Visite</th>
                <th>Ultima</th>
                <th>Spesa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.key} className={open?.key === c.key ? "is-open" : ""}>
                  <td data-label="Cliente">
                    <button type="button" className="crm-link" onClick={() => onSelect(open?.key === c.key ? null : c)}>
                      {c.name || "—"}
                    </button>
                  </td>
                  <td data-label="Telefono">{c.phone || "—"}</td>
                  <td data-label="Email">{c.email || "—"}</td>
                  <td data-label="Servizi">{c.services.slice(0, 2).map((s) => s.name).join(", ") || "—"}</td>
                  <td data-label="Visite">
                    {c.visitCount}
                    {c.cancelledCount ? ` (${c.cancelledCount} ann.)` : ""}
                  </td>
                  <td data-label="Ultima">
                    {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString("it-IT") : "—"}
                    {c.lastVisitStatus === "cancelled" ? " · annullata" : ""}
                  </td>
                  <td data-label="Spesa">{formatEuroCents(c.spendCents)}</td>
                  <td data-label="Contatta">
                    <button type="button" className="crm-icon-btn" onClick={() => onNotify(c)} aria-label="Contatta">
                      <Mail size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? (
        <section className="crm-card">
          <header className="crm-card-head">
            <div>
              <h2 className="font-serif">{open.name}</h2>
              <p>
                {open.phone || "Nessun telefono"} · {open.email || "Nessuna email"}
              </p>
            </div>
            <button type="button" className="btn btn-gold" onClick={() => onNotify(open)}>
              Contatta
            </button>
          </header>
          <p className="crm-meta">
            {open.visitCount} visite (di cui {open.cancelledCount} annullate) · spesa {formatEuroCents(open.spendCents)}
          </p>
          <h3>Storico (inclusi annullati)</h3>
          {open.history.length === 0 ? (
            <p className="slot-status">Nessuna visita.</p>
          ) : (
            <ul className="crm-history">
              {open.history.map((h) => (
                <li key={h.id} className={h.cancelled ? "is-cancelled" : ""}>
                  <span>{new Date(h.startsAt).toLocaleString("it-IT")}</span>
                  <span>{h.serviceNames || "—"}</span>
                  <span>{h.barberName}</span>
                  <span>{STATUS_IT[h.status] || h.status}</span>
                  <span>{formatEuroCents(h.priceCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function StatsView({ stats, date, weekStart }: { stats: CrmStats | null; date: string; weekStart?: string }) {
  return (
    <div className="crm-stack">
      <section className="crm-kpis">
        <Kpi label="Visite per cliente" value={(stats?.visitsPerClient || 0).toLocaleString("it-IT", { maximumFractionDigits: 2 })} />
        <Kpi label="Tasso disdetta / no-show" value={pct(stats?.cancelRate || 0)} hint={`${stats?.cancelledCount ?? 0} su ${stats?.totalVisits ?? 0}`} />
        <Kpi label="Incasso giorno" value={formatEuroCents(stats?.takings.dayCents || 0)} hint={formatItalianDate(date)} />
        <Kpi label="Incasso settimana" value={formatEuroCents(stats?.takings.weekCents || 0)} hint={weekStart ? `da lunedì ${weekStart}` : undefined} />
      </section>
      <div className="crm-split">
        <section className="crm-card">
          <h2 className="font-serif">Servizi più frequenti</h2>
          {stats?.mostFrequentServices.length ? (
            <ul className="crm-bars">
              {stats.mostFrequentServices.map((s) => {
                const max = stats.mostFrequentServices[0]?.count || 1;
                return (
                  <li key={s.id}>
                    <div>
                      <span>{s.name}</span>
                      <em>{s.count}</em>
                    </div>
                    <div className="crm-bar">
                      <span style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="slot-status">Nessun dato servizi.</p>
          )}
        </section>
        <section className="crm-card">
          <h2 className="font-serif">Incassi per poltrona</h2>
          {stats?.takingsByBarber.length ? (
            <ul className="crm-list">
              {stats.takingsByBarber.map((b) => (
                <li key={b.barberId}>
                  <strong>{b.name}</strong>
                  <span>{formatEuroCents(b.cents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="slot-status">Nessun incasso registrato (walk-in e confermati).</p>
          )}
        </section>
      </div>
    </div>
  );
}

function NotifyModal({ client, onClose }: { client: ClientRecord; onClose: () => void }) {
  const [template, setTemplate] = useState<NotifyTemplate>("reminder");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const last = client.history[0];
  const copy = useMemo(
    () =>
      buildNotifyCopy(template, {
        firstName: client.firstName || client.name,
        dateLabel: last ? new Date(last.startsAt).toLocaleDateString("it-IT") : undefined,
        serviceNames: last?.serviceNames,
        barberName: last?.barberName,
      }),
    [template, client, last],
  );
  const wa = waMeUrl(client.phone, copy.text);

  async function sendEmail() {
    setSending(true);
    setMsg("");
    const res = await fetch("/api/admin/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template,
        to: client.email || undefined,
        firstName: client.firstName || client.name,
        appointmentId: last?.id && last.id.includes("-") ? last.id : undefined,
        dateLabel: last ? new Date(last.startsAt).toLocaleDateString("it-IT") : undefined,
        serviceNames: last?.serviceNames,
        barberName: last?.barberName,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setSending(false);
    if (!res.ok) {
      setMsg(json.error || "Invio email non riuscito.");
      return;
    }
    setMsg("Email inviata.");
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal crm-notify" onClick={(e) => e.stopPropagation()}>
        <header className="crm-card-head">
          <div>
            <p className="eyebrow">Contatta</p>
            <h2 className="font-serif">{client.name}</h2>
          </div>
          <button type="button" className="crm-icon-btn" onClick={onClose} aria-label="Chiudi">
            <X size={18} />
          </button>
        </header>
        <label>
          Messaggio
          <select className="input-lux" value={template} onChange={(e) => setTemplate(e.target.value as NotifyTemplate)}>
            {(Object.keys(NOTIFY_TEMPLATE_LABEL) as NotifyTemplate[]).map((k) => (
              <option key={k} value={k}>
                {NOTIFY_TEMPLATE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <p className="crm-preview">{copy.text}</p>
        <div className="admin-head-actions">
          <button type="button" className="btn btn-gold" disabled={sending} onClick={() => void sendEmail()}>
            <Mail size={16} aria-hidden /> {sending ? "Invio…" : "Invia email"}
          </button>
          {wa ? (
            <a className="btn btn-outline" href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden /> WhatsApp (gratis)
            </a>
          ) : (
            <span className="field-error">{WHATSAPP_MISSING_IT}</span>
          )}
        </div>
        <p className="crm-hint">
          WhatsApp si apre su wa.me con il tuo account: zero costi, niente Twilio. L&apos;email usa Resend se la chiave è
          impostata.
        </p>
        {msg ? <p className={msg.startsWith("Email") ? "crm-ok" : "field-error"}>{msg}</p> : null}
      </div>
    </div>
  );
}

function BulkWhatsAppModal({ clients, onClose }: { clients: ClientRecord[]; onClose: () => void }) {
  const [template, setTemplate] = useState<NotifyTemplate>("promo");
  const withPhone = clients.filter((c) => waMeUrl(c.phone, "x"));
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal crm-notify" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">WhatsApp massivo</p>
        <h2 className="font-serif">Chat dal tuo telefono</h2>
        <p className="crm-hint">
          Ogni link apre WhatsApp sul tuo numero (gratis). I browser bloccano i popup: apri una chat alla volta.
        </p>
        <label>
          Messaggio
          <select className="input-lux" value={template} onChange={(e) => setTemplate(e.target.value as NotifyTemplate)}>
            {(Object.keys(NOTIFY_TEMPLATE_LABEL) as NotifyTemplate[]).map((k) => (
              <option key={k} value={k}>
                {NOTIFY_TEMPLATE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {withPhone.length === 0 ? (
          <p className="slot-status">Nessun cliente con numero WhatsApp.</p>
        ) : (
          <ul className="crm-wa-bulk">
            {withPhone.map((c) => {
              const copy = buildNotifyCopy(template, { firstName: c.firstName || c.name });
              const href = waMeUrl(c.phone, copy.text);
              return (
                <li key={c.key}>
                  <span>{c.name}</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      Apri WhatsApp
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

function StoricoView({
  history,
  onDelete,
}: {
  history: HistoryAppt[];
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string, label: string) {
    if (
      !window.confirm(
        `Eliminare definitivamente questo appuntamento?\n\n${label}\n\nL'operazione non si può annullare.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="crm-stack">
      <section className="crm-card">
        <h2 className="font-serif">Storico completo</h2>
        <p className="slot-status">
          Tutti gli appuntamenti, inclusi gli annullati. Puoi eliminare una voce errata o di test con «Elimina».
        </p>
        {history.length === 0 ? (
          <p className="slot-status">Nessun appuntamento in archivio.</p>
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ora</th>
                  <th>Cliente</th>
                  <th>Servizio</th>
                  <th>Barbiere</th>
                  <th>Stato</th>
                  <th>Prezzo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={h.status === "cancelled" ? "is-cancelled" : ""}>
                    <td data-label="Data">{h.dateLabel}</td>
                    <td data-label="Ora">{h.timeLabel}</td>
                    <td data-label="Cliente">{h.customerName}</td>
                    <td data-label="Servizio">{h.serviceNames}</td>
                    <td data-label="Barbiere">{h.barberName}</td>
                    <td data-label="Stato">{h.statusLabel}</td>
                    <td data-label="Prezzo">{formatEuroCents(h.priceCents)}</td>
                    <td data-label="Azioni">
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={deletingId === h.id}
                        onClick={() =>
                          void remove(
                            h.id,
                            `${h.dateLabel} ${h.timeLabel} · ${h.customerName} · ${h.serviceNames}`,
                          )
                        }
                      >
                        {deletingId === h.id ? "…" : "Elimina"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function WalkInModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const [serviceIds, setServiceIds] = useState<string[]>(["taglio-standard"]);
  const [barberId, setBarberId] = useState("felice");
  const [startTime, setStartTime] = useState("09:30");
  const [firstName, setFirstName] = useState("Walk-in");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [priceEuro, setPriceEuro] = useState(15);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totals = useMemo(() => totalsForServices(SERVICES.filter((s) => serviceIds.includes(s.id))), [serviceIds]);
  useEffect(() => {
    setPriceEuro(totals.priceEuro);
  }, [totals.priceEuro]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/walk-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds, barberId, date, startTime, firstName, phone, email, priceEuro }),
    });
    const json = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Impossibile salvare.");
      return;
    }
    onSaved();
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <p className="eyebrow">Walk-in</p>
        <h2 className="font-serif">Inserisci in agenda</h2>
        <label>
          Barbiere
          <select className="input-lux" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            {getRealBarbers().map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Servizi
          <div className="walkin-services">
            {SERVICES.map((s) => (
              <label key={s.id} className={`walkin-service${serviceIds.includes(s.id) ? " selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() =>
                    setServiceIds((curr) =>
                      curr.includes(s.id) ? curr.filter((id) => id !== s.id) : [...curr, s.id],
                    )
                  }
                />
                <span>
                  {s.name} · {formatPrice(s)}
                </span>
              </label>
            ))}
          </div>
        </label>
        <label>
          Orario
          <input className="input-lux" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label>
          Nome
          <input className="input-lux" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label>
          Telefono
          <input className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="opzionale" />
        </label>
        <label>
          Email
          <input className="input-lux" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opzionale" />
        </label>
        <label>
          Prezzo effettivo (€)
          <input className="input-lux" type="number" min={0} value={priceEuro} onChange={(e) => setPriceEuro(Number(e.target.value))} />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="admin-head-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Chiudi
          </button>
          <button type="submit" className="btn btn-gold" disabled={saving || serviceIds.length === 0}>
            {saving ? "Salvataggio…" : "Salva walk-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
