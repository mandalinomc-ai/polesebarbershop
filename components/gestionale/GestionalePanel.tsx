"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Scissors,
  Search,
  Users,
  X,
} from "lucide-react";
import { CrmNotificationBell } from "@/components/gestionale/CrmNotificationBell";
import { ServicesAdminPanel } from "@/components/gestionale/ServicesAdminPanel";
import { getRealBarbers, SERVICES, formatDuration, formatPrice, totalsForServices } from "@/lib/catalog";
import {
  formatItalianDate,
  getFirstBookableDate,
  getOccupancyGrid,
  wallTimeToUtc,
} from "@/lib/availability";
import { SITE } from "@/lib/site-config";
import { SiteLogo } from "@/components/site/SiteImage";
import { formatEuroCents, type ClientRecord, type CrmStats, type StatsPeriod } from "@/lib/crm";
import {
  NOTIFY_TEMPLATE_LABEL,
  WHATSAPP_MISSING_IT,
  buildNotifyCopy,
  waMeUrl,
  type NotifyTemplate,
} from "@/lib/crm-notify";

type Tab = "dashboard" | "agenda" | "listino" | "clienti" | "statistiche" | "storico";

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
  durationOverrideMin?: number | null;
  effectiveDurationMin?: number;
  priceCents: number;
  isWalkIn: boolean;
  startsAt?: string;
  endsAt?: string;
};

type Agenda = {
  date: string;
  weekStart: string;
  view?: string;
  rangeFrom?: string;
  rangeTo?: string;
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
  { id: "listino", label: "Listino", icon: Scissors },
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
  const [walkPreset, setWalkPreset] = useState<{ barberId: string; startTime: string } | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [notifyFor, setNotifyFor] = useState<ClientRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [agendaView, setAgendaView] = useState<"day" | "week">("day");
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("month");
  const [history, setHistory] = useState<HistoryAppt[]>([]);
  const [moveAppt, setMoveAppt] = useState<AdminAppt | null>(null);
  const [bellTick, setBellTick] = useState(0);

  const loadAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/appointments?date=${date}&view=${agendaView}`);
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
  }, [date, agendaView]);

  const loadCrm = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/crm?date=${date}&period=${statsPeriod}`);
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
  }, [date, statsPeriod]);

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
      setBellTick((n) => n + 1);
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
            <CrmNotificationBell
              reloadToken={bellTick}
              onOpenAppointment={(d) => {
                setDate(d);
                setTab("agenda");
              }}
            />
            <input
              className="input-lux"
              type="date"
              value={date}
              min={SITE.openingDate}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Data agenda"
            />
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setWalkPreset(null);
                setWalkOpen(true);
              }}
            >
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
            agenda={agenda}
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
            view={agendaView}
            onViewChange={setAgendaView}
            onPatch={patch}
            onMove={setMoveAppt}
            onQuickWalkIn={(barberId, startTime) => {
              setWalkPreset({ barberId, startTime });
              setWalkOpen(true);
            }}
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
                  nextVisitAt: null,
                  topService: null,
                  lastServiceIds: [],
                  topBarber: appt.barberName,
                  crmNotes: "",
                  incomplete: !(appt.phone || "").replace(/\D/g, "").length && !(appt.email || "").includes("@"),
                  services: [],
                  history: [
                    {
                      id: appt.id,
                      startsAt: appt.startsAt || new Date().toISOString(),
                      status: appt.status,
                      cancelled: appt.status === "cancelled",
                      serviceNames: appt.serviceNames,
                      serviceIds: [],
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
        {tab === "listino" ? <ServicesAdminPanel /> : null}
        {tab === "clienti" ? (
          <ClientiView
            clients={filteredClients}
            search={search}
            onSearch={setSearch}
            selected={selected}
            onSelect={setSelected}
            onNotify={setNotifyFor}
            onBulk={() => setBulkOpen(true)}
            onSaveNotes={async (key, notes) => {
              const res = await fetch("/api/admin/crm", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientKey: key, notes }),
              });
              if (res.ok) void loadCrm();
            }}
            onClientsChanged={() => void loadCrm()}
            total={clients.length}
          />
        ) : null}
        {tab === "statistiche" ? (
          <StatsView stats={stats} date={date} weekStart={agenda?.weekStart} period={statsPeriod} onPeriodChange={setStatsPeriod} />
        ) : null}
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
          clients={clients}
          preset={walkPreset}
          onClose={() => {
            setWalkOpen(false);
            setWalkPreset(null);
          }}
          onSaved={() => {
            setWalkOpen(false);
            setWalkPreset(null);
            void load();
          }}
        />
      ) : null}
      {notifyFor ? <NotifyModal client={notifyFor} onClose={() => setNotifyFor(null)} /> : null}
      {bulkOpen ? <BulkWhatsAppModal clients={filteredClients} onClose={() => setBulkOpen(false)} /> : null}
      {moveAppt ? (
        <MoveModal
          appt={moveAppt}
          date={date}
          onClose={() => setMoveAppt(null)}
          onSaved={() => {
            setMoveAppt(null);
            void load();
          }}
        />
      ) : null}
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
  agenda,
  onOpenClient,
}: {
  stats: CrmStats | null;
  clients: ClientRecord[];
  date: string;
  agenda: Agenda | null;
  onOpenClient: (c: ClientRecord) => void;
}) {
  const recent = clients.slice(0, 6);
  const todayAppts = (agenda?.appointments || []).filter((a) => a.status !== "cancelled");
  const upcoming = clients
    .flatMap((c) => c.history)
    .filter((h) => !h.cancelled && h.startsAt > new Date().toISOString())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);
  return (
    <div className="crm-stack">
      <section className="crm-kpis">
        <Kpi label="Oggi in agenda" value={String(stats?.todayAppointments ?? todayAppts.length)} hint={formatItalianDate(date)} />
        <Kpi label="Prossimi" value={String(stats?.upcomingCount ?? 0)} hint="Appuntamenti futuri confermati" />
        <Kpi label="Incasso previsto oggi" value={formatEuroCents(stats?.expectedRevenueCents || 0)} hint="Solo confermati" />
        <Kpi label="Confermati" value={String(stats?.confirmedCount ?? 0)} hint={`Periodo: ${stats?.period || "all"}`} />
        <Kpi label="Annullati" value={String(stats?.cancelledCount ?? 0)} hint={pct(stats?.cancelRate || 0)} />
        <Kpi label="Clienti nuovi / di ritorno" value={`${stats?.newClients ?? 0} / ${stats?.returningClients ?? 0}`} />
        <Kpi label="Clienti totali" value={String(stats?.totalClients ?? 0)} hint="Anagrafica da prenotazioni e walk-in" />
        <Kpi label="Incasso giorno" value={formatEuroCents(stats?.takings.dayCents || 0)} hint={formatItalianDate(date)} />
        <Kpi
          label="Incasso settimana"
          value={formatEuroCents(stats?.takings.weekCents || 0)}
          hint="Walk-in + prenotazioni confermate"
        />
      </section>
      <div className="crm-split">
        <section className="crm-card">
          <h2 className="font-serif">Appuntamenti di oggi</h2>
          {todayAppts.length === 0 ? (
            <p className="slot-status">Nessun appuntamento oggi.</p>
          ) : (
            <ul className="crm-list">
              {todayAppts.map((a) => (
                <li key={a.id}>
                  <strong>{a.timeLabel}</strong>
                  <span>
                    {a.firstName} {a.lastName} · {a.serviceNames} · {a.barberName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="crm-card">
          <h2 className="font-serif">Prossimi appuntamenti</h2>
          {upcoming.length === 0 ? (
            <p className="slot-status">Nessun appuntamento in programma.</p>
          ) : (
            <ul className="crm-list">
              {upcoming.map((h) => (
                <li key={h.id}>
                  <strong>{new Date(h.startsAt).toLocaleString("it-IT")}</strong>
                  <span>
                    {h.serviceNames} · {h.barberName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
  view,
  onViewChange,
  onPatch,
  onMove,
  onNotify,
  onQuickWalkIn,
}: {
  agenda: Agenda | null;
  date: string;
  view: "day" | "week";
  onViewChange: (v: "day" | "week") => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onMove: (a: AdminAppt) => void;
  onNotify: (a: AdminAppt) => void;
  onQuickWalkIn: (barberId: string, startTime: string) => void;
}) {
  const occupying = useMemo(
    () =>
      (agenda?.appointments || [])
        .filter((a) => a.status !== "cancelled")
        .map((a) => {
          const start = a.startsAt
            ? new Date(a.startsAt)
            : wallTimeToUtc(date, a.timeLabel);
          const dur = a.effectiveDurationMin || a.durationOverrideMin || a.durationMin;
          const end = a.endsAt
            ? new Date(a.endsAt)
            : new Date(start.getTime() + dur * 60_000);
          const name = `${a.firstName} ${a.lastName}`.trim();
          const services = (a.serviceNames || "").replace(/\s*\+\s*/g, " + ");
          return {
            id: a.id,
            barberId: a.barberId,
            startsAt: start,
            endsAt: end,
            label: `${name || "Cliente"} — ${services || "Servizio"} · ${dur} min`,
          };
        }),
    [agenda, date],
  );
  const occupancy = useMemo(
    () => getOccupancyGrid({ date, appointments: occupying }),
    [date, occupying],
  );
  const byBarber = (id: string) => (agenda?.appointments || []).filter((a) => a.barberId === id);
  return (
    <div className="crm-stack">
      <div className="crm-toolbar">
        <div className="crm-view-toggle">
          <button type="button" className={view === "day" ? "active" : ""} onClick={() => onViewChange("day")}>
            Giorno
          </button>
          <button type="button" className={view === "week" ? "active" : ""} onClick={() => onViewChange("week")}>
            Settimana
          </button>
        </div>
        {view === "week" && agenda?.rangeFrom ? (
          <p className="slot-status">
            {formatItalianDate(agenda.rangeFrom)} — {formatItalianDate(agenda.rangeTo || agenda.rangeFrom)}
          </p>
        ) : null}
      </div>
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
      <section className="occupancy-wrap" aria-label="Occupazione poltrone">
        <h2 className="font-serif">Tabella orari</h2>
        <p className="slot-status occupancy-legend">
          Tocca una cella <strong>Libero</strong> per walk-in rapido. Un appuntamento multi-servizio = un solo blocco continuo.
        </p>
        {occupancy.length === 0 ? (
          <p className="slot-status">Nessuna fascia oraria: salone chiuso o data non valida.</p>
        ) : (
          <div className="crm-table-wrap occupancy-scroll">
            <table className="crm-table occupancy-table">
              <thead>
                <tr>
                  <th>Ora</th>
                  {getRealBarbers().map((b) => (
                    <th key={b.id}>{b.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {occupancy.map((row) => (
                  <tr key={row.time}>
                    <th scope="row">{row.time}</th>
                    {row.cells.map((cell) =>
                      cell.skip ? null : (
                        <td
                          key={cell.barberId}
                          rowSpan={cell.occupied ? cell.rowSpan : 1}
                          className={cell.occupied ? "taken" : "free"}
                        >
                          {cell.occupied ? (
                            <span className="occupancy-block">{cell.label || "Prenotato"}</span>
                          ) : (
                            <button
                              type="button"
                              className="occupancy-free-btn"
                              onClick={() => onQuickWalkIn(cell.barberId, row.time)}
                            >
                              Libero
                            </button>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="agenda-columns">
        {getRealBarbers().map((b) => (
          <div key={b.id} className="agenda-col">
            <h2 className="font-serif">{b.name}</h2>
            {byBarber(b.id).length === 0 ? (
              <p className="slot-status">Nessun appuntamento</p>
            ) : (
              byBarber(b.id).map((a) => {
                const dur = a.effectiveDurationMin || a.durationOverrideMin || a.durationMin;
                const services = (a.serviceNames || "").replace(/\s*\+\s*/g, " + ");
                return (
                <article key={a.id} className={`agenda-card status-${a.status}`}>
                  <header>
                    <strong>{a.timeLabel}</strong>
                    <span>{dur} min</span>
                  </header>
                  <p>
                    {a.firstName} {a.lastName} — {services}
                    {a.isWalkIn ? " · Walk-in" : ""}
                    {a.status === "cancelled" ? " · Annullato" : ""}
                  </p>
                  <p className="agenda-price">{formatEuroCents(a.priceCents)}</p>
                  {a.status === "cancelled" ? (
                    <p className="field-error">Annullato — resta in storico cliente</p>
                  ) : (
                    <div className="agenda-actions">
                      <button type="button" onClick={() => onPatch(a.id, { status: "confirmed" })}>
                        Conferma
                      </button>
                      <button type="button" onClick={() => onPatch(a.id, { status: "completed" })}>
                        Completato
                      </button>
                      <button type="button" onClick={() => onMove(a)}>
                        Sposta
                      </button>
                      <button type="button" onClick={() => onPatch(a.id, { status: "cancelled" })}>
                        Annulla
                      </button>
                      <button type="button" onClick={() => onNotify(a)}>
                        Invia WhatsApp
                      </button>
                    </div>
                  )}
                </article>
              );
              })
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
  onSaveNotes,
  onClientsChanged,
  total,
}: {
  clients: ClientRecord[];
  search: string;
  onSearch: (v: string) => void;
  selected: ClientRecord | null;
  onSelect: (c: ClientRecord | null) => void;
  onNotify: (c: ClientRecord) => void;
  onBulk: () => void;
  onSaveNotes: (key: string, notes: string) => Promise<void>;
  onClientsChanged: () => void;
  total: number;
}) {
  const [filter, setFilter] = useState<"all" | "incomplete">("all");
  const visible = useMemo(
    () => (filter === "incomplete" ? clients.filter((c) => c.incomplete) : clients),
    [clients, filter],
  );
  const incompleteCount = useMemo(() => clients.filter((c) => c.incomplete).length, [clients]);
  const open = selected && visible.find((c) => c.key === selected.key)
    ? selected
    : selected && clients.find((c) => c.key === selected.key)
      ? selected
      : null;
  const [notesDraft, setNotesDraft] = useState("");
  const [notesMsg, setNotesMsg] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  useEffect(() => {
    setNotesDraft(open?.crmNotes || "");
    setNotesMsg("");
    setPhoneDraft(open?.phone || "");
    setEmailDraft(open?.email || "");
    setContactMsg("");
  }, [open?.key, open?.crmNotes, open?.phone, open?.email]);
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
        <div className="crm-view-toggle">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            Tutti
          </button>
          <button type="button" className={filter === "incomplete" ? "active" : ""} onClick={() => setFilter("incomplete")}>
            Anagrafiche incomplete{incompleteCount ? ` (${incompleteCount})` : ""}
          </button>
        </div>
        <button type="button" className="btn btn-outline" onClick={onBulk} disabled={clients.length === 0}>
          <MessageCircle size={16} aria-hidden /> WhatsApp massivo
        </button>
      </div>
      {total === 0 ? (
        <p className="slot-status">Nessun cliente in anagrafica.</p>
      ) : visible.length === 0 ? (
        <p className="slot-status">
          {filter === "incomplete" ? "Nessuna anagrafica incompleta." : `Nessun risultato per «${search}».`}
        </p>
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
              {visible.map((c) => (
                <tr key={c.key} className={open?.key === c.key ? "is-open" : ""}>
                  <td data-label="Cliente">
                    <button type="button" className="crm-link" onClick={() => onSelect(open?.key === c.key ? null : c)}>
                      {c.name || "—"}
                      {c.incomplete ? " · incompleta" : ""}
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
              {open.incomplete ? <p className="crm-incomplete-flag">Anagrafica incompleta</p> : null}
            </div>
            <button type="button" className="btn btn-gold" onClick={() => onNotify(open)}>
              Contatta
            </button>
          </header>
          {open.incomplete ? (
            <div className="crm-complete-sheet">
              <label>
                Telefono
                <input className="input-lux" inputMode="tel" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
              </label>
              <label>
                Email
                <input className="input-lux" type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
              </label>
              <button
                type="button"
                className="btn btn-outline"
                disabled={savingContact}
                onClick={() => {
                  void (async () => {
                    setSavingContact(true);
                    setContactMsg("");
                    const res = await fetch("/api/admin/clients", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        firstName: open.firstName,
                        lastName: open.lastName,
                        phone: phoneDraft,
                        email: emailDraft,
                      }),
                    });
                    const json = (await res.json()) as { error?: string };
                    setSavingContact(false);
                    if (!res.ok) {
                      setContactMsg(json.error || "Errore salvataggio.");
                      return;
                    }
                    setContactMsg("Anagrafica aggiornata.");
                    onClientsChanged();
                  })();
                }}
              >
                {savingContact ? "…" : "Completa anagrafica"}
              </button>
              {contactMsg ? <span className="crm-ok">{contactMsg}</span> : null}
            </div>
          ) : null}
          <p className="crm-meta">
            {open.visitCount} visite (di cui {open.cancelledCount} annullate) · spesa {formatEuroCents(open.spendCents)}
            {open.topService ? ` · preferito: ${open.topService}` : ""}
            {open.topBarber ? ` · top barbiere: ${open.topBarber}` : ""}
            {open.nextVisitAt ? ` · prossimo: ${new Date(open.nextVisitAt).toLocaleString("it-IT")}` : ""}
          </p>
          <label className="crm-notes-field">
            Note cliente
            <textarea
              className="input-lux"
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Preferenze, allergie, promemoria…"
            />
          </label>
          <div className="admin-head-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void onSaveNotes(open.key, notesDraft).then(() => setNotesMsg("Note salvate."))}
            >
              Salva note
            </button>
            {notesMsg ? <span className="crm-ok">{notesMsg}</span> : null}
          </div>
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
                  <span>{h.cancelled ? "ANNULLATA" : STATUS_IT[h.status] || h.status}</span>
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

function StatsView({
  stats,
  date,
  weekStart,
  period,
  onPeriodChange,
}: {
  stats: CrmStats | null;
  date: string;
  weekStart?: string;
  period: StatsPeriod;
  onPeriodChange: (p: StatsPeriod) => void;
}) {
  const periods: { id: StatsPeriod; label: string }[] = [
    { id: "today", label: "Oggi" },
    { id: "7d", label: "7 giorni" },
    { id: "month", label: "Mese" },
    { id: "year", label: "Anno" },
    { id: "all", label: "Tutto" },
  ];
  const maxAppt = Math.max(...(stats?.appointmentsOverTime.map((p) => p.count) || [1]), 1);
  const maxRev = Math.max(...(stats?.revenueOverTime.map((p) => p.revenueCents) || [1]), 1);
  return (
    <div className="crm-stack">
      <div className="crm-toolbar">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            className={period === p.id ? "btn btn-gold" : "btn btn-outline"}
            onClick={() => onPeriodChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <section className="crm-kpis">
        <Kpi label="Appuntamenti" value={String(stats?.totalVisits ?? 0)} hint={`Periodo: ${period}`} />
        <Kpi label="Incasso periodo" value={formatEuroCents(stats?.takings.totalCents || 0)} />
        <Kpi label="Ticket medio" value={formatEuroCents(stats?.ticketMedioCents || 0)} />
        <Kpi label="Clienti nuovi" value={String(stats?.newClients ?? 0)} />
        <Kpi label="Clienti di ritorno" value={String(stats?.returningClients ?? 0)} />
        <Kpi label="Visite per cliente" value={(stats?.visitsPerClient || 0).toLocaleString("it-IT", { maximumFractionDigits: 2 })} />
        <Kpi label="Tasso disdetta" value={pct(stats?.cancelRate || 0)} hint={`${stats?.cancelledCount ?? 0} su ${stats?.totalVisits ?? 0}`} />
        <Kpi label="Incasso giorno" value={formatEuroCents(stats?.takings.dayCents || 0)} hint={formatItalianDate(date)} />
        <Kpi label="Incasso settimana" value={formatEuroCents(stats?.takings.weekCents || 0)} hint={weekStart ? `da lunedì ${weekStart}` : undefined} />
      </section>
      <div className="crm-split">
        <section className="crm-card">
          <h2 className="font-serif">Appuntamenti nel tempo</h2>
          {stats?.appointmentsOverTime.length ? (
            <ul className="crm-bars">
              {stats.appointmentsOverTime.map((p) => (
                <li key={p.date}>
                  <div>
                    <span>{p.date}</span>
                    <em>{p.count}</em>
                  </div>
                  <div className="crm-bar">
                    <span style={{ width: `${(p.count / maxAppt) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="slot-status">Nessun dato nel periodo selezionato.</p>
          )}
        </section>
        <section className="crm-card">
          <h2 className="font-serif">Incassi nel tempo</h2>
          {stats?.revenueOverTime.length ? (
            <ul className="crm-bars">
              {stats.revenueOverTime.map((p) => (
                <li key={`rev-${p.date}`}>
                  <div>
                    <span>{p.date}</span>
                    <em>{formatEuroCents(p.revenueCents)}</em>
                  </div>
                  <div className="crm-bar">
                    <span style={{ width: `${(p.revenueCents / maxRev) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="slot-status">Nessun incasso nel periodo.</p>
          )}
        </section>
      </div>
      <div className="crm-split">
        <section className="crm-card">
          <h2 className="font-serif">Servizi per incasso</h2>
          {stats?.revenueByService.length ? (
            <ul className="crm-bars">
              {stats.revenueByService.map((s) => {
                const max = stats.revenueByService[0]?.revenueCents || 1;
                return (
                  <li key={`rev-${s.id}`}>
                    <div>
                      <span>{s.name}</span>
                      <em>{formatEuroCents(s.revenueCents)}</em>
                    </div>
                    <div className="crm-bar">
                      <span style={{ width: `${(s.revenueCents / max) * 100}%` }} />
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
          <h2 className="font-serif">Felice vs Davide</h2>
          {stats?.takingsByBarber.length ? (
            <ul className="crm-list">
              {stats.takingsByBarber.map((b) => (
                <li key={b.barberId}>
                  <strong>{b.name}</strong>
                  <span>
                    {formatEuroCents(b.cents)} · {b.count} app.
                  </span>
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
              <MessageCircle size={16} aria-hidden /> Invia WhatsApp
            </a>
          ) : (
            <span className="field-error">{WHATSAPP_MISSING_IT}</span>
          )}
        </div>
        <p className="crm-hint">
          WhatsApp si apre su wa.me con il tuo account: zero costi, niente Twilio. L&apos;email usa Gmail SMTP se le
          credenziali sono impostate.
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

function WalkInModal({
  date,
  clients,
  preset,
  onClose,
  onSaved,
}: {
  date: string;
  clients: ClientRecord[];
  preset: { barberId: string; startTime: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const requestId = useRef(`wi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [serviceIds, setServiceIds] = useState<string[]>(["taglio-standard"]);
  const [barberId, setBarberId] = useState(preset?.barberId || "felice");
  const [startTime, setStartTime] = useState(preset?.startTime || "09:30");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [priceEuro, setPriceEuro] = useState(15);
  const [durationOverride, setDurationOverride] = useState("");
  const [error, setError] = useState("");
  const [alternatives, setAlternatives] = useState<{ label: string; startIso: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [finding, setFinding] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const totals = useMemo(() => totalsForServices(SERVICES.filter((s) => serviceIds.includes(s.id))), [serviceIds]);
  const hasUnknownDuration = useMemo(
    () => SERVICES.some((s) => serviceIds.includes(s.id) && !s.durationKnown),
    [serviceIds],
  );
  const suggestions = useMemo(() => {
    const q = `${firstName} ${lastName}`.trim().toLowerCase();
    if (q.length < 2) return [];
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [clients, firstName, lastName]);

  useEffect(() => {
    if (preset?.barberId) setBarberId(preset.barberId);
    if (preset?.startTime) setStartTime(preset.startTime);
  }, [preset?.barberId, preset?.startTime]);

  useEffect(() => {
    setPriceEuro(totals.priceEuro);
  }, [totals.priceEuro]);

  function pickClient(c: ClientRecord) {
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setPhone(c.phone || "");
    setEmail(c.email || "");
    if (c.lastServiceIds?.length) setServiceIds(c.lastServiceIds);
    setSuggestOpen(false);
  }

  function toggleService(id: string) {
    setServiceIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  async function findSlot(mode: "day" | "first" | "best") {
    setFinding(true);
    setError("");
    const params = new URLSearchParams({
      date,
      barberId,
      serviceIds: serviceIds.join(","),
      mode,
    });
    if (durationOverride) params.set("durationOverrideMin", durationOverride);
    try {
      const res = await fetch(`/api/admin/find-slot?${params}`);
      const json = (await res.json()) as {
        error?: string;
        first?: { label: string; barberId?: string } | null;
        slot?: { label: string; date?: string; barberId?: string } | null;
        message?: string;
      };
      if (!res.ok) {
        setError(json.error || "Ricerca non riuscita.");
        return;
      }
      if (mode === "first") {
        if (!json.slot) {
          setError(json.message || "Nessuna disponibilità.");
          return;
        }
        setStartTime(json.slot.label);
        if (json.slot.date && json.slot.date !== date) {
          setError(`Prima disponibilità: ${json.slot.date} alle ${json.slot.label}`);
        }
      } else if (mode === "best") {
        if (!json.slot && !json.first) {
          setError(json.message || "Nessun orario libero in questa data.");
          return;
        }
        const label = json.slot?.label || json.first?.label;
        if (label) setStartTime(label);
        if (json.slot?.barberId) setBarberId(json.slot.barberId);
        else if (json.first?.barberId) setBarberId(json.first.barberId);
      } else if (json.first) {
        setStartTime(json.first.label);
      } else {
        setError("Nessun orario libero in questa data.");
      }
    } catch {
      setError("Connessione non disponibile.");
    } finally {
      setFinding(false);
    }
  }

  async function save(e: FormEvent, force = false) {
    e.preventDefault();
    if (saving) return;
    if (!firstName.trim()) {
      setError("Inserisci almeno il nome.");
      return;
    }
    setSaving(true);
    setError("");
    setAlternatives([]);
    try {
      const res = await fetch("/api/admin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds,
          barberId,
          date,
          startTime,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          email,
          priceEuro,
          durationOverrideMin: durationOverride ? Number(durationOverride) : null,
          force,
          clientRequestId: requestId.current,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        conflict?: boolean;
        alternatives?: { label: string; startIso: string }[];
      };
      if (!res.ok) {
        setError(json.error || "Impossibile salvare.");
        if (json.alternatives?.length) setAlternatives(json.alternatives);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void save(e)}>
        <p className="eyebrow">Walk-in</p>
        <h2 className="font-serif">{preset ? `Rapido · ${preset.startTime}` : "Inserisci in agenda"}</h2>
        <div className="walkin-field">
          <span className="walkin-field-label">Barbiere</span>
          <div className="walkin-chip-grid">
            {getRealBarbers().map((b) => (
              <button
                key={b.id}
                type="button"
                className={`walkin-chip${barberId === b.id ? " is-on" : ""}`}
                onClick={() => setBarberId(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <div className="walkin-field">
          <span className="walkin-field-label">Trattamenti</span>
          <div className="walkin-chip-grid">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`walkin-chip${serviceIds.includes(s.id) ? " is-on" : ""}`}
                onClick={() => toggleService(s.id)}
              >
                {s.name} · {formatPrice(s)}
                {!s.durationKnown ? " · durata?" : ` · ${formatDuration(s)}`}
              </button>
            ))}
          </div>
        </div>
        {hasUnknownDuration ? (
          <label>
            Durata override (min)
            <input
              className="input-lux"
              type="number"
              min={1}
              max={480}
              required
              placeholder={String(totals.durationMin || "")}
              value={durationOverride}
              onChange={(e) => setDurationOverride(e.target.value)}
            />
          </label>
        ) : null}
        <label>
          Orario
          <input className="input-lux" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <div className="admin-head-actions" style={{ marginBottom: "0.5rem" }}>
          <button type="button" className="btn btn-outline" disabled={finding || saving || serviceIds.length === 0} onClick={() => void findSlot("day")}>
            {finding ? "…" : "Trova orario"}
          </button>
          <button type="button" className="btn btn-outline" disabled={finding || saving || serviceIds.length === 0} onClick={() => void findSlot("best")}>
            Trova migliore
          </button>
          <button type="button" className="btn btn-outline" disabled={finding || saving || serviceIds.length === 0} onClick={() => void findSlot("first")}>
            Prima disponibilità
          </button>
        </div>
        <div className="walkin-suggest-wrap">
          <label>
            Nome
            <input
              className="input-lux"
              value={firstName}
              autoComplete="off"
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSuggestOpen(true);
              }}
            />
          </label>
          <label>
            Cognome
            <input
              className="input-lux"
              value={lastName}
              autoComplete="off"
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setLastName(e.target.value);
                setSuggestOpen(true);
              }}
            />
          </label>
          {suggestOpen && suggestions.length > 0 ? (
            <ul className="walkin-suggest-list">
              {suggestions.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => pickClient(c)}>
                    <strong>{c.name}</strong>
                    <span>
                      {c.phone || "no tel"} · ultima: {c.services[0]?.name || c.topService || "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label>
          Telefono <em>(opzionale)</em>
          <input className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="se manca → anagrafica incompleta" />
        </label>
        <label>
          Email <em>(opzionale)</em>
          <input className="input-lux" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Prezzo (€)
          <input className="input-lux" type="number" min={0} value={priceEuro} onChange={(e) => setPriceEuro(Number(e.target.value))} />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        {alternatives.length > 0 ? (
          <div className="walkin-chip-grid">
            {alternatives.map((a) => (
              <button
                key={a.startIso}
                type="button"
                className="walkin-chip"
                onClick={() => {
                  setStartTime(a.label);
                  setAlternatives([]);
                  setError("");
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-head-actions">
          <button type="button" className="btn btn-outline" disabled={saving} onClick={onClose}>
            Chiudi
          </button>
          {alternatives.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={saving}
              onClick={(e) => {
                if (window.confirm("Forzare l'inserimento anche in conflitto?")) void save(e, true);
              }}
            >
              Forza comunque
            </button>
          ) : null}
          <button type="submit" className="btn btn-gold" disabled={saving || serviceIds.length === 0}>
            {saving ? "Salvataggio…" : "Salva walk-in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MoveModal({
  appt,
  date,
  onClose,
  onSaved,
}: {
  appt: AdminAppt;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [moveDate, setMoveDate] = useState(date);
  const [startTime, setStartTime] = useState(appt.timeLabel);
  const [barberId, setBarberId] = useState(appt.barberId);
  const [durationOverride, setDurationOverride] = useState(
    appt.durationOverrideMin != null ? String(appt.durationOverrideMin) : "",
  );
  const [error, setError] = useState("");
  const [alternatives, setAlternatives] = useState<
    { label: string; startIso: string; date?: string; barberId?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    if (appt.startsAt) {
      const d = new Date(appt.startsAt);
      setMoveDate(d.toISOString().slice(0, 10));
    } else {
      setMoveDate(date);
    }
    setStartTime(appt.timeLabel);
    setBarberId(appt.barberId);
    setDurationOverride(appt.durationOverrideMin != null ? String(appt.durationOverrideMin) : "");
  }, [appt, date]);

  async function findBest(mode: "day" | "first" | "best") {
    setFinding(true);
    setError("");
    const params = new URLSearchParams({
      date: moveDate,
      barberId,
      durationMin: String(appt.effectiveDurationMin || appt.durationMin),
      mode,
      excludeId: appt.id,
    });
    if (durationOverride) params.set("durationOverrideMin", durationOverride);
    try {
      const res = await fetch(`/api/admin/find-slot?${params}`);
      const json = (await res.json()) as {
        error?: string;
        first?: { label: string; barberId?: string } | null;
        slot?: { label: string; date?: string; barberId?: string; rank?: string } | null;
        message?: string;
        rank?: string;
      };
      if (!res.ok) {
        setError(json.error || "Ricerca non riuscita.");
        return;
      }
      if (mode === "first" && json.slot) {
        if (json.slot.date) setMoveDate(json.slot.date);
        setStartTime(json.slot.label);
        if (json.slot.barberId) setBarberId(json.slot.barberId);
      } else if (mode === "best" && (json.slot || json.first)) {
        const label = json.slot?.label || json.first?.label;
        if (label) setStartTime(label);
        if (json.slot?.barberId) setBarberId(json.slot.barberId);
        else if (json.first?.barberId) setBarberId(json.first.barberId);
      } else if (json.first) {
        setStartTime(json.first.label);
      } else {
        setError(json.message || "Nessun orario libero.");
      }
    } catch {
      setError("Connessione non disponibile.");
    } finally {
      setFinding(false);
    }
  }

  async function save(e: FormEvent, force = false) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setAlternatives([]);
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: appt.id,
        date: moveDate,
        startTime,
        barberId,
        durationOverrideMin: durationOverride ? Number(durationOverride) : null,
        force,
        confirmForce: force,
      }),
    });
    const json = (await res.json()) as {
      error?: string;
      conflict?: boolean;
      alternatives?: { label: string; startIso: string; date?: string; barberId?: string }[];
    };
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Impossibile spostare.");
      if (json.alternatives?.length) setAlternatives(json.alternatives);
      return;
    }
    onSaved();
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void save(e)}>
        <p className="eyebrow">Sposta appuntamento</p>
        <h2 className="font-serif">
          {appt.firstName} {appt.lastName}
        </h2>
        <p className="slot-status">{appt.serviceNames}</p>
        <label>
          Data
          <input className="input-lux" type="date" value={moveDate} min={SITE.openingDate} onChange={(e) => setMoveDate(e.target.value)} />
        </label>
        <label>
          Orario
          <input className="input-lux" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
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
          Durata override (min)
          <input
            className="input-lux"
            type="number"
            min={1}
            max={480}
            placeholder={`Catalogo: ${appt.durationMin}`}
            value={durationOverride}
            onChange={(e) => setDurationOverride(e.target.value)}
          />
        </label>
        <div className="admin-head-actions" style={{ marginBottom: "0.5rem" }}>
          <button type="button" className="btn btn-outline" disabled={finding} onClick={() => void findBest("day")}>
            {finding ? "…" : "Trova orario"}
          </button>
          <button type="button" className="btn btn-outline" disabled={finding} onClick={() => void findBest("best")}>
            Trova migliore
          </button>
          <button type="button" className="btn btn-outline" disabled={finding} onClick={() => void findBest("first")}>
            Smart move
          </button>
        </div>
        {error ? <p className="field-error">{error}</p> : null}
        {alternatives.length > 0 ? (
          <div className="walkin-services">
            <p className="slot-status">Alternative:</p>
            {alternatives.map((a) => (
              <button
                key={a.startIso}
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStartTime(a.label);
                  if (a.date) setMoveDate(a.date);
                  if (a.barberId) setBarberId(a.barberId);
                  setAlternatives([]);
                  setError("");
                }}
              >
                {a.date ? `${a.date} ` : ""}
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-head-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annulla
          </button>
          {alternatives.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={saving}
              onClick={(e) => {
                if (
                  window.confirm(
                    "Forzare lo spostamento in conflitto? Il database può comunque rifiutare se l'orario è davvero occupato.",
                  )
                ) {
                  void save(e, true);
                }
              }}
            >
              Forza comunque
            </button>
          ) : null}
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? "Salvataggio…" : "Sposta"}
          </button>
        </div>
      </form>
    </div>
  );
}
