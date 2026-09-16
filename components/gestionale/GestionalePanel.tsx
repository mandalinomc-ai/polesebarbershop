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
import { getRealBarbers, SERVICES, formatPrice, totalsForServices } from "@/lib/catalog";
import { WEEKDAY_OPTIONS_IT } from "@/lib/subscriptions";
import {
  formatItalianDate,
  getFirstBookableDate,
  getOccupancyGrid,
  OCCUPANCY_STEP_MINUTES,
  wallTimeToUtc,
} from "@/lib/availability";
import { BOOKING_BUFFER_MINUTES, CONFIG_CALENDAR_BLOCKS, type CalendarBlock } from "@/lib/booking";
import {
  formatAgendaBlockLabel,
  formatFreeSlotLabel,
  formatTimeRange,
  freeMinutesFromStart,
  INSUFFICIENT_AGENDA_TIME_IT,
  newBookingBlockMinutes,
  resolveAppointmentBlock,
  serviceFitsInFreeMinutes,
} from "@/lib/gestionale/agenda-block";
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
  /** Optional; missing → treat as 0 for legacy rows. */
  bufferTime?: number | null;
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
  walk_in: "Prenota in sede",
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

  /** Mark a specific half-hour as unavailable (blocks online booking for that chair). */
  async function quickBlockHalfHour(day: string, barberId: string, startTime: string) {
    const endTime = addMinutesHhMm(startTime, OCCUPANCY_STEP_MINUTES);
    const res = await fetch("/api/admin/calendar-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: day,
        start: startTime,
        end: endTime,
        barberId,
        label: "Non disponibile",
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Impossibile bloccare la fascia.");
      return;
    }
    void load();
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
              placeholder="Password gestionale"
              required
            />
          </label>
          <p className="slot-status">Accesso riservato al salone.</p>
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
              <Plus size={16} aria-hidden /> Prenota in sede
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
          <>
            <OperatorOfflinePanel date={date} onChanged={() => void load()} />
            <BlockTimePanel date={date} onChanged={() => void load()} />
            <SubscriptionPanel date={date} clients={clients} onChanged={() => void load()} />
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
            onQuickBlock={(barberId, startTime) => {
              void quickBlockHalfHour(date, barberId, startTime);
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
                  lastService: null,
                  lastBarberId: appt.barberId,
                  lastTimeLabel: appt.timeLabel || null,
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
          </>
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
            onCancelAppt={(id) => void patch(id, { status: "cancelled" })}
            onMoveAppt={setMoveAppt}
            total={clients.length}
          />
        ) : null}
        {tab === "statistiche" ? (
          <StatsView
            stats={stats}
            date={date}
            weekStart={agenda?.weekStart}
            period={statsPeriod}
            onPeriodChange={setStatsPeriod}
            onReload={() => void load()}
          />
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
          appointments={agenda?.appointments || []}
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
  onQuickBlock,
}: {
  agenda: Agenda | null;
  date: string;
  view: "day" | "week";
  onViewChange: (v: "day" | "week") => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onMove: (a: AdminAppt) => void;
  onNotify: (a: AdminAppt) => void;
  onQuickWalkIn: (barberId: string, startTime: string) => void;
  onQuickBlock: (barberId: string, startTime: string) => void;
}) {
  const occupying = useMemo(
    () =>
      (agenda?.appointments || [])
        .filter((a) => a.status !== "cancelled")
        .map((a) => {
          const dur = a.effectiveDurationMin || a.durationOverrideMin || a.durationMin;
          const block = resolveAppointmentBlock({
            startsAt: a.startsAt || wallTimeToUtc(date, a.timeLabel),
            endsAt: a.endsAt,
            durationMin: dur,
            bufferTime: a.bufferTime,
          });
          const name = `${a.firstName} ${a.lastName}`.trim();
          const services = (a.serviceNames || "").replace(/\s*\+\s*/g, " + ");
          return {
            id: a.id,
            barberId: a.barberId,
            startsAt: block.start,
            endsAt: block.end,
            label: formatAgendaBlockLabel(
              block.start,
              block.end,
              `${name || "Cliente"} - ${services || "Servizio"}`,
            ),
          };
        }),
    [agenda, date],
  );
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/calendar-blocks");
      const json = (await res.json()) as { blocks?: CalendarBlock[] };
      if (!cancelled && res.ok) setCalendarBlocks(json.blocks || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, agenda]);
  const occupancy = useMemo(
    () =>
      getOccupancyGrid({
        date,
        appointments: occupying,
        calendarBlocks: [
          ...CONFIG_CALENDAR_BLOCKS,
          ...calendarBlocks.filter((b) => b.date === date),
        ],
      }),
    [date, occupying, calendarBlocks],
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
          Tocca <strong>Libero</strong> per prenotare. Su una prenotazione: <strong>Elimina</strong> o doppio click / <strong>Modifica</strong> per spostarla (anche singola occorrenza di abbonamento).
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
                          className={
                            cell.occupied
                              ? cell.blocked
                                ? "taken blocked"
                                : "taken"
                              : "free"
                          }
                        >
                          {cell.occupied ? (
                            <div
                              className="occupancy-taken"
                              title={
                                cell.blocked
                                  ? cell.label || "Non disponibile"
                                  : "Doppio click per modificare / spostare"
                              }
                              onDoubleClick={() => {
                                if (cell.blocked || !cell.appointmentId) return;
                                const appt = (agenda?.appointments || []).find(
                                  (a) => a.id === cell.appointmentId,
                                );
                                if (appt) onMove(appt);
                              }}
                            >
                              <span className="occupancy-block">{cell.label || "Prenotato"}</span>
                              {cell.appointmentId ? (
                                <div className="occupancy-taken-actions">
                                  <button
                                    type="button"
                                    className="occupancy-edit-btn"
                                    onClick={() => {
                                      const appt = (agenda?.appointments || []).find(
                                        (a) => a.id === cell.appointmentId,
                                      );
                                      if (appt) onMove(appt);
                                    }}
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    className="occupancy-remove-btn"
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          "Rimuovere questa prenotazione confermata dall'agenda?",
                                        )
                                      ) {
                                        return;
                                      }
                                      onPatch(cell.appointmentId!, { status: "cancelled" });
                                    }}
                                  >
                                    Elimina
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="occupancy-free-actions">
                              <button
                                type="button"
                                className="occupancy-free-btn"
                                onClick={() => onQuickWalkIn(cell.barberId, row.time)}
                              >
                                <span className="occupancy-free-plus" aria-hidden>
                                  +
                                </span>
                                <span className="occupancy-free-label">
                                  {formatFreeSlotLabel(row.time, OCCUPANCY_STEP_MINUTES)}
                                </span>
                                <span className="occupancy-free-hint">Prenota</span>
                              </button>
                              <button
                                type="button"
                                className="occupancy-block-btn"
                                title={`Non disponibile ${row.time}–${addMinutesHhMm(row.time, OCCUPANCY_STEP_MINUTES)}`}
                                onClick={() => onQuickBlock(cell.barberId, row.time)}
                              >
                                Non disp.
                              </button>
                            </div>
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
                const block = resolveAppointmentBlock({
                  startsAt: a.startsAt || wallTimeToUtc(date, a.timeLabel),
                  endsAt: a.endsAt,
                  durationMin: dur,
                  bufferTime: a.bufferTime,
                });
                return (
                <article key={a.id} className={`agenda-card status-${a.status}`}>
                  <header>
                    <strong>{formatTimeRange(block.start, block.end)}</strong>
                    <span>{dur} min</span>
                  </header>
                  <p>
                    {a.firstName} {a.lastName} — {services}
                    {a.isWalkIn ? " · In sede" : ""}
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
                        Elimina
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
  onCancelAppt,
  onMoveAppt,
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
  onCancelAppt: (id: string) => void;
  onMoveAppt: (a: AdminAppt) => void;
  total: number;
}) {
  const [filter, setFilter] = useState<"all" | "incomplete">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const visible = useMemo(
    () => (filter === "incomplete" ? clients.filter((c) => c.incomplete) : clients),
    [clients, filter],
  );
  const incompleteCount = useMemo(() => clients.filter((c) => c.incomplete).length, [clients]);
  const recentClients = useMemo(
    () =>
      [...clients]
        .filter((c) => c.lastVisitAt)
        .sort((a, b) => (b.lastVisitAt || "").localeCompare(a.lastVisitAt || ""))
        .slice(0, 8),
    [clients],
  );
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
      <section className="crm-card">
        <h2 className="font-serif">Clienti recenti</h2>
        <p className="slot-status" style={{ marginTop: 0 }}>
          Ultimo trattamento e preferito.
        </p>
        {recentClients.length === 0 ? (
          <p className="slot-status">Nessuna visita recente.</p>
        ) : (
          <div className="crm-recent-grid">
            {recentClients.map((c) => (
              <button key={`recent-${c.key}`} type="button" className="crm-recent-card" onClick={() => onSelect(c)}>
                <strong>{c.name || "—"}</strong>
                {c.incomplete ? <span className="crm-incomplete-flag">Scheda incompleta</span> : null}
                <span>Ultimo: {c.lastService || "—"}</span>
                <span>Preferito: {c.topService || c.lastService || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </section>
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
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setAddFirst("");
            setAddLast("");
            setAddPhone("");
            setAddEmail("");
            setAddError("");
            setAddOpen(true);
          }}
        >
          <Plus size={16} aria-hidden /> Aggiungi cliente
        </button>
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
                  {!h.cancelled ? (
                    <span className="crm-history-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                          onMoveAppt({
                            id: h.id,
                            status: h.status,
                            barberId: h.barberId || "felice",
                            barberName: h.barberName,
                            serviceNames: h.serviceNames,
                            firstName: open.firstName,
                            lastName: open.lastName,
                            phone: open.phone,
                            email: open.email,
                            timeLabel:
                              h.timeLabel ||
                              new Date(h.startsAt).toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              }),
                            durationMin: 30,
                            priceCents: h.priceCents,
                            isWalkIn: h.isWalkIn,
                            startsAt: h.startsAt,
                          })
                        }
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Eliminare questa prenotazione dall'agenda? (vale anche per appuntamenti già creati)",
                            )
                          ) {
                            return;
                          }
                          onCancelAppt(h.id);
                        }}
                      >
                        Elimina
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {addOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setAddOpen(false)}>
          <form
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setAddSaving(true);
                setAddError("");
                const res = await fetch("/api/admin/clients", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    firstName: addFirst,
                    lastName: addLast,
                    phone: addPhone,
                    email: addEmail,
                  }),
                });
                const json = (await res.json()) as { error?: string };
                setAddSaving(false);
                if (!res.ok) {
                  setAddError(json.error || "Salvataggio non riuscito.");
                  return;
                }
                setAddOpen(false);
                onClientsChanged();
              })();
            }}
          >
            <p className="eyebrow">Clienti</p>
            <h2 className="font-serif">Aggiungi cliente</h2>
            <label>
              Nome
              <input className="input-lux" required value={addFirst} onChange={(e) => setAddFirst(e.target.value)} />
            </label>
            <label>
              Cognome
              <input className="input-lux" required value={addLast} onChange={(e) => setAddLast(e.target.value)} />
            </label>
            <label>
              Telefono
              <input className="input-lux" inputMode="tel" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            </label>
            <label>
              Email
              <input className="input-lux" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </label>
            {addError ? <p className="field-error">{addError}</p> : null}
            <div className="admin-head-actions">
              <button type="button" className="btn btn-outline" onClick={() => setAddOpen(false)}>
                Chiudi
              </button>
              <button type="submit" className="btn btn-gold" disabled={addSaving}>
                {addSaving ? "…" : "Salva in CRM"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function OperatorOfflinePanel({
  date,
  onChanged,
}: {
  date: string;
  onChanged: () => void;
}) {
  const operators = useMemo(() => getRealBarbers(), []);
  const [barberId, setBarberId] = useState(operators[0]?.id || "felice");
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/operator-offline?date=${encodeURIComponent(date)}`);
    const json = (await res.json()) as { offlineBarberIds?: string[]; error?: string };
    if (!res.ok) {
      setError(json.error || "");
      return;
    }
    setOfflineIds(json.offlineBarberIds || []);
    setError("");
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOffline = offlineIds.includes(barberId);
  const barberName = operators.find((b) => b.id === barberId)?.name || barberId;

  async function toggle() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/operator-offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, barberId, offline: !isOffline }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Operazione non riuscita.");
        return;
      }
      await refresh();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="crm-card operator-offline-panel" aria-label="Operatore offline">
      <h2 className="font-serif">Operatore offline</h2>
      <p className="slot-status">
        Disattiva Felice o Davide per <strong>{formatItalianDate(date)}</strong>: tutte le fasce
        diventano non prenotabili sul sito e in gestionale.
      </p>
      <div className="operator-offline-row">
        <label className="operator-offline-select">
          Operatore
          <select
            className="input-lux"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            disabled={saving}
          >
            {operators.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {offlineIds.includes(b.id) ? " · offline" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={isOffline ? "btn btn-gold" : "btn btn-outline"}
          disabled={saving}
          onClick={() => void toggle()}
        >
          {saving ? "…" : isOffline ? `Riattiva ${barberName}` : "Operatore offline"}
        </button>
      </div>
      {isOffline ? (
        <p className="crm-warning">
          {barberName} è offline per questa giornata — orari bloccati su front e gestionale.
        </p>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </section>
  );
}

function addMinutesHhMm(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function BlockTimePanel({ date, onChanged }: { date: string; onChanged: () => void }) {
  const [blockDate, setBlockDate] = useState(date);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("10:30");
  const [label, setLabel] = useState("Non disponibile");
  const [barberId, setBarberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blocks, setBlocks] = useState<
    { id: string; date?: string | null; start: string; end: string; label?: string; barberId?: string | null }[]
  >([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/calendar-blocks");
    const json = (await res.json()) as { blocks?: typeof blocks };
    if (res.ok) setBlocks(json.blocks || []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setBlockDate(date);
  }, [date]);

  function setStartAndHalfHour(nextStart: string) {
    setStart(nextStart);
    setEnd(addMinutesHhMm(nextStart, OCCUPANCY_STEP_MINUTES));
  }

  async function saveBlock(overrides?: {
    start?: string;
    end?: string;
    barberId?: string;
    label?: string;
  }) {
    setSaving(true);
    setError("");
    const s = overrides?.start ?? start;
    const e = overrides?.end ?? end;
    try {
      const res = await fetch("/api/admin/calendar-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockDate,
          start: s,
          end: e,
          label: overrides?.label ?? label,
          barberId: (overrides?.barberId ?? barberId) || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Blocco non salvato.");
        return;
      }
      await refresh();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/admin/calendar-blocks?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await refresh();
      onChanged();
    }
  }

  const dayBlocks = blocks.filter((b) => b.date === blockDate);
  const halfHourPresets = useMemo(() => {
    // Shop-typical half hours for quick tap (open days).
    const out: string[] = [];
    for (let min = 8 * 60; min < 21 * 60; min += OCCUPANCY_STEP_MINUTES) {
      const hh = String(Math.floor(min / 60)).padStart(2, "0");
      const mm = String(min % 60).padStart(2, "0");
      out.push(`${hh}:${mm}`);
    }
    return out;
  }, []);

  return (
    <section className="crm-card block-time-panel">
      <h2 className="font-serif">Blocca Orario</h2>
      <p className="slot-status">
        Segna <strong>non disponibile</strong> a scatti di {OCCUPANCY_STEP_MINUTES} min (servizio esterno, permesso).
        La pausa pranzo 13:00–14:00 è già esclusa. Puoi anche toccare «Non disp.» sulle celle libere in agenda.
      </p>
      <div className="block-time-presets" aria-label="Mezzore rapide">
        {halfHourPresets.map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn-outline block-time-chip${start === t ? " is-on" : ""}`}
            disabled={saving}
            onClick={() => {
              setStartAndHalfHour(t);
              void saveBlock({
                start: t,
                end: addMinutesHhMm(t, OCCUPANCY_STEP_MINUTES),
                label: "Non disponibile",
              });
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="block-time-form">
        <label>
          Data
          <input className="input-lux" type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
        </label>
        <label>
          Inizio
          <input
            className="input-lux"
            type="time"
            step={OCCUPANCY_STEP_MINUTES * 60}
            value={start}
            onChange={(e) => setStartAndHalfHour(e.target.value.slice(0, 5))}
          />
        </label>
        <label>
          Fine
          <input
            className="input-lux"
            type="time"
            step={OCCUPANCY_STEP_MINUTES * 60}
            value={end}
            onChange={(e) => setEnd(e.target.value.slice(0, 5))}
          />
        </label>
        <label>
          Barbiere
          <select className="input-lux" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="">Tutti</option>
            {getRealBarbers().map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motivo
          <input className="input-lux" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <button type="button" className="btn btn-gold" disabled={saving} onClick={() => void saveBlock()}>
          {saving ? "…" : "Non disponibile"}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {dayBlocks.length ? (
        <ul className="crm-list">
          {dayBlocks.map((b) => (
            <li key={b.id}>
              <strong>
                {b.start}–{b.end}
              </strong>
              <span>
                {b.label || "Blocco"}
                {b.barberId ? ` · ${b.barberId}` : " · tutti"}
              </span>
              <button type="button" className="btn btn-outline" onClick={() => void removeBlock(b.id)}>
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="slot-status">Nessun blocco personalizzato per questa data.</p>
      )}
    </section>
  );
}

function StatsView({
  stats,
  date,
  weekStart,
  period,
  onPeriodChange,
  onReload,
}: {
  stats: CrmStats | null;
  date: string;
  weekStart?: string;
  period: StatsPeriod;
  onPeriodChange: (p: StatsPeriod) => void;
  onReload: () => void;
}) {
  const [excludingId, setExcludingId] = useState<string | null>(null);
  const periods: { id: StatsPeriod; label: string }[] = [
    { id: "today", label: "Oggi" },
    { id: "7d", label: "7 giorni" },
    { id: "month", label: "Mese" },
    { id: "year", label: "Anno" },
    { id: "all", label: "Tutto" },
  ];
  const maxAppt = Math.max(...(stats?.appointmentsOverTime.map((p) => p.count) || [1]), 1);
  const maxRev = Math.max(...(stats?.revenueOverTime.map((p) => p.revenueCents) || [1]), 1);

  async function excludeTransaction(id: string) {
    if (!window.confirm("Escludere questo incasso dalle statistiche? (soft delete)")) return;
    setExcludingId(id);
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeFromStats: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(json.error || "Operazione non riuscita.");
        return;
      }
      onReload();
    } finally {
      setExcludingId(null);
    }
  }

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
      <section className="crm-card">
        <h2 className="font-serif">Incassi singoli</h2>
        <p className="slot-status">Elimina (soft) una voce per sottrarla dai totali senza cancellare l&apos;appuntamento dall&apos;agenda.</p>
        {stats?.paidTransactions?.length ? (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ora</th>
                  <th>Cliente</th>
                  <th>Servizio</th>
                  <th>Barbiere</th>
                  <th>Importo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.paidTransactions.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Data">{t.dateLabel}</td>
                    <td data-label="Ora">{t.timeLabel}</td>
                    <td data-label="Cliente">{t.customerName}</td>
                    <td data-label="Servizio">{t.serviceNames}</td>
                    <td data-label="Barbiere">{t.barberName}</td>
                    <td data-label="Importo">{formatEuroCents(t.priceCents)}</td>
                    <td data-label="Azioni">
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={excludingId === t.id}
                        onClick={() => void excludeTransaction(t.id)}
                      >
                        {excludingId === t.id ? "…" : "Elimina incasso"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="slot-status">Nessun incasso nel periodo.</p>
        )}
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
  appointments,
  preset,
  onClose,
  onSaved,
}: {
  date: string;
  clients: ClientRecord[];
  appointments: AdminAppt[];
  preset: { barberId: string; startTime: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const requestId = useRef(`wi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const nameRef = useRef<HTMLInputElement>(null);
  const appliedClientKey = useRef<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>(["taglio-standard"]);
  const [barberId, setBarberId] = useState(preset?.barberId || "felice");
  const [startTime, setStartTime] = useState(preset?.startTime || "09:30");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  /** Contatti solo da anagrafica (mai mostrati nel form). */
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

  const freeMinutes = useMemo(
    () =>
      freeMinutesFromStart({
        date,
        startTime,
        barberId,
        appointments: appointments.map((a) => ({
          barberId: a.barberId,
          startsAt: a.startsAt || wallTimeToUtc(date, a.timeLabel),
          endsAt: a.endsAt,
          durationMin: a.effectiveDurationMin || a.durationOverrideMin || a.durationMin,
          bufferTime: a.bufferTime,
          status: a.status,
        })),
      }),
    [appointments, barberId, date, startTime],
  );

  const effectiveServiceMin = useMemo(() => {
    if (durationOverride && Number(durationOverride) > 0) return Number(durationOverride);
    return totals.durationMin;
  }, [durationOverride, totals.durationMin]);

  const neededBlockMin = useMemo(
    () => newBookingBlockMinutes(effectiveServiceMin || 0),
    [effectiveServiceMin],
  );

  const selectionFits = useMemo(
    () => serviceFitsInFreeMinutes(effectiveServiceMin || 0, freeMinutes),
    [effectiveServiceMin, freeMinutes],
  );

  const frequentClients = useMemo(
    () =>
      [...clients]
        .filter((c) => c.visitCount > 0 && c.name.trim())
        .sort((a, b) => b.visitCount - a.visitCount || (b.lastVisitAt || "").localeCompare(a.lastVisitAt || ""))
        .slice(0, 6),
    [clients],
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

  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  /** Auto-match unique anagrafica while typing → last treatment. */
  useEffect(() => {
    const q = `${firstName} ${lastName}`.trim().toLowerCase();
    if (q.length < 3) return;
    const exact = clients.filter((c) => {
      const full = c.name.trim().toLowerCase();
      const composed = `${c.firstName} ${c.lastName}`.trim().toLowerCase();
      return full === q || composed === q;
    });
    if (exact.length !== 1) return;
    const hit = exact[0]!;
    if (appliedClientKey.current === hit.key) return;
    appliedClientKey.current = hit.key;
    setPhone(hit.phone || "");
    setEmail(hit.email || "");
    if (hit.lastServiceIds?.length) setServiceIds(hit.lastServiceIds);
    // Ripeti ultima visita: orario + barbiere (se non si è partiti da una cella Libero).
    if (!preset) {
      if (hit.lastBarberId) setBarberId(hit.lastBarberId);
      if (hit.lastTimeLabel) setStartTime(hit.lastTimeLabel);
    }
  }, [clients, firstName, lastName, preset]);

  function pickClient(c: ClientRecord) {
    appliedClientKey.current = c.key;
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setPhone(c.phone || "");
    setEmail(c.email || "");
    if (c.lastServiceIds?.length) setServiceIds([...c.lastServiceIds]);
    if (!preset) {
      if (c.lastBarberId) setBarberId(c.lastBarberId);
      if (c.lastTimeLabel) setStartTime(c.lastTimeLabel);
    }
    setSuggestOpen(false);
    setError("");
  }

  function serviceDisabled(id: string): boolean {
    const alone = SERVICES.find((s) => s.id === id);
    if (!alone?.durationKnown) return false;
    if (serviceIds.includes(id)) {
      // Keep selected chips interactive so operator can deselect.
      return false;
    }
    const nextIds = [...serviceIds, id];
    const nextTotals = totalsForServices(SERVICES.filter((s) => nextIds.includes(s.id)));
    const override = durationOverride && Number(durationOverride) > 0 ? Number(durationOverride) : null;
    const dur = override ?? nextTotals.durationMin;
    return !serviceFitsInFreeMinutes(dur, freeMinutes);
  }

  function toggleService(id: string) {
    if (!serviceIds.includes(id) && serviceDisabled(id)) {
      setError(INSUFFICIENT_AGENDA_TIME_IT);
      return;
    }
    setServiceIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
    setError("");
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
    if (!selectionFits || serviceIds.length === 0) {
      setError(INSUFFICIENT_AGENDA_TIME_IT);
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
      <form className="admin-modal walkin-modal-ergonomic" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void save(e)}>
        <p className="eyebrow">Prenota in sede</p>
        <h2 className="font-serif">{preset ? `${preset.startTime} · tap e vai` : "Prenota in sede"}</h2>
        {frequentClients.length > 0 ? (
          <div className="walkin-field">
            <span className="walkin-field-label">Clienti frequenti · un tocco</span>
            <div className="walkin-chip-grid walkin-chip-grid--xl">
              {frequentClients.map((c) => (
                <button
                  key={`freq-${c.key}`}
                  type="button"
                  className="walkin-chip walkin-chip--xl"
                  onClick={() => pickClient(c)}
                >
                  {c.name}
                  {c.lastService ? <small>ultima: {c.lastService}</small> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="walkin-field">
          <span className="walkin-field-label">Barbiere</span>
          <div className="walkin-chip-grid walkin-chip-grid--xl">
            {getRealBarbers().map((b) => (
              <button
                key={b.id}
                type="button"
                className={`walkin-chip walkin-chip--xl${barberId === b.id ? " is-on" : ""}`}
                onClick={() => setBarberId(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <div className="walkin-field">
          <span className="walkin-field-label">
            Trattamenti
            <em className="walkin-gap-hint">
              {" "}
              · libero {freeMinutes} min · blocco {neededBlockMin || "—"} min
              {BOOKING_BUFFER_MINUTES > 0 ? ` (+${BOOKING_BUFFER_MINUTES} buffer)` : ""}
            </em>
          </span>
          <div className="walkin-chip-grid walkin-chip-grid--xl">
            <p className="slot-status" style={{ gridColumn: "1 / -1" }}>
              Prenota ora (online)
            </p>
            {SERVICES.filter((s) => !s.whatsAppOnly).map((s) => {
              const disabled = serviceDisabled(s.id);
              const block = s.durationKnown ? newBookingBlockMinutes(s.durationMin) : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  title={disabled ? INSUFFICIENT_AGENDA_TIME_IT : undefined}
                  className={`walkin-chip walkin-chip--xl${serviceIds.includes(s.id) ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
                  onClick={() => toggleService(s.id)}
                >
                  {s.name}
                  <small>
                    {formatPrice(s)}
                    {!s.durationKnown
                      ? " · durata?"
                      : BOOKING_BUFFER_MINUTES > 0
                        ? ` · ${s.durationMin}+${BOOKING_BUFFER_MINUTES}=${block} min`
                        : ` · ${s.durationMin} min`}
                  </small>
                </button>
              );
            })}
            <p className="slot-status" style={{ gridColumn: "1 / -1" }}>
              Consulenza (solo salone · regola tu i minuti)
            </p>
            {SERVICES.filter((s) => s.whatsAppOnly).map((s) => {
              const disabled = serviceDisabled(s.id);
              const block = s.durationKnown ? newBookingBlockMinutes(s.durationMin) : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  title={disabled ? INSUFFICIENT_AGENDA_TIME_IT : undefined}
                  className={`walkin-chip walkin-chip--xl walkin-chip--consult${serviceIds.includes(s.id) ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
                  onClick={() => toggleService(s.id)}
                >
                  {s.name}
                  <small>
                    {formatPrice(s)}
                    {!s.durationKnown
                      ? " · durata?"
                      : ` · cat. ${s.durationMin} min · override sotto`}
                    {block ? ` · blocco ${block}` : ""}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
        {hasUnknownDuration ||
        SERVICES.some((s) => serviceIds.includes(s.id) && s.whatsAppOnly) ? (
          <label>
            Durata effettiva (min) — obbligatoria se tempi diversi dal listino
            <input
              className="input-lux"
              type="number"
              min={1}
              max={480}
              placeholder={`Catalogo: ${totals.durationMin || ""}`}
              value={durationOverride}
              onChange={(e) => setDurationOverride(e.target.value)}
            />
          </label>
        ) : null}
        {!preset ? (
          <>
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
          </>
        ) : (
          <p className="slot-status walkin-preset-banner">
            Orario <strong>{startTime}</strong> · barbiere già impostato dalla cella Libero · {freeMinutes} min liberi
          </p>
        )}
        <div className="walkin-suggest-wrap">
          <label>
            Nome
            <input
              ref={nameRef}
              className="input-lux input-lux--lg"
              value={firstName}
              autoComplete="off"
              enterKeyHint="next"
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setFirstName(e.target.value);
                setPhone("");
                setEmail("");
                appliedClientKey.current = null;
                setSuggestOpen(true);
              }}
            />
          </label>
          <label>
            Cognome
            <input
              className="input-lux input-lux--lg"
              value={lastName}
              autoComplete="off"
              enterKeyHint="done"
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setLastName(e.target.value);
                setPhone("");
                setEmail("");
                appliedClientKey.current = null;
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
                    <span>ultima: {c.lastService || c.topService || "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label>
          Prezzo (€)
          <input className="input-lux" type="number" min={0} value={priceEuro} onChange={(e) => setPriceEuro(Number(e.target.value))} />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        {!selectionFits && !error ? (
          <p className="field-error">{INSUFFICIENT_AGENDA_TIME_IT}</p>
        ) : null}
        {alternatives.length > 0 ? (
          <div className="walkin-chip-grid walkin-chip-grid--xl">
            {alternatives.map((a) => (
              <button
                key={a.startIso}
                type="button"
                className="walkin-chip walkin-chip--xl"
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
              disabled={saving || !selectionFits}
              onClick={(e) => {
                if (!selectionFits) {
                  setError(INSUFFICIENT_AGENDA_TIME_IT);
                  return;
                }
                if (window.confirm("Forzare l'inserimento anche in conflitto?")) void save(e, true);
              }}
            >
              Forza comunque
            </button>
          ) : null}
          <button
            type="submit"
            className="btn btn-gold btn-touch-xl"
            disabled={saving || serviceIds.length === 0 || !firstName.trim() || !selectionFits}
          >
            {saving ? "Salvataggio…" : "Salva"}
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
  const [notifyHint, setNotifyHint] = useState<{
    message?: string;
    waUrl?: string | null;
    notified?: boolean;
  } | null>(null);

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
    setNotifyHint(null);
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
      clientNotify?: {
        notified?: boolean;
        customerWhatsAppUrl?: string | null;
        rescheduleMessage?: string;
        emailSent?: boolean;
        whatsappSent?: boolean;
      };
    };
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Impossibile spostare.");
      if (json.alternatives?.length) setAlternatives(json.alternatives);
      return;
    }
    const n = json.clientNotify;
    if (n) {
      setNotifyHint({
        notified: Boolean(n.notified),
        waUrl: n.customerWhatsAppUrl,
        message: n.rescheduleMessage,
      });
      // Keep modal briefly so staff can open WA if auto-notify failed.
      if (n.notified && !n.customerWhatsAppUrl) {
        onSaved();
        return;
      }
      if (n.notified && n.whatsappSent) {
        onSaved();
        return;
      }
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
        {notifyHint ? (
          <div className="walkin-services">
            <p className="slot-status">
              {notifyHint.notified
                ? "Orario salvato · cliente avvisato."
                : "Orario salvato · avvisa il cliente (email/WhatsApp automatici non partiti)."}
            </p>
            {notifyHint.waUrl ? (
              <a className="btn btn-listino-wa" href={notifyHint.waUrl} target="_blank" rel="noopener noreferrer">
                Apri WhatsApp al cliente
              </a>
            ) : null}
            <button type="button" className="btn btn-gold" onClick={onSaved}>
              Chiudi e aggiorna agenda
            </button>
          </div>
        ) : null}
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

function SubscriptionPanel({
  date,
  clients,
  onChanged,
}: {
  date: string;
  clients: ClientRecord[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<
    { id: string; firstName: string; lastName: string; weekday: number; startTime: string; barberId: string; endsOn: string }[]
  >([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [barberId, setBarberId] = useState("felice");
  const [serviceIds, setServiceIds] = useState<string[]>(["taglio-standard"]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("10:00");
  const [startsOn, setStartsOn] = useState(date);
  const [endsOn, setEndsOn] = useState(() => {
    const d = new Date(`${date}T12:00:00`);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  async function loadSubs() {
    const res = await fetch("/api/admin/subscriptions");
    const json = (await res.json()) as {
      subscriptions?: typeof subs;
      warning?: string;
      error?: string;
    };
    if (!res.ok) {
      // Never surface migration/SQL-editor messages — abbonamenti have appointments fallback.
      const msg = json.error || "";
      if (/014_booking|migrat|SQL Editor|booking_subscriptions/i.test(msg)) {
        setWarning("");
        setSubs([]);
        return;
      }
      setWarning(msg);
      return;
    }
    setSubs(json.subscriptions || []);
    setWarning(
      json.warning && !/014_booking|migrat|SQL Editor|booking_subscriptions/i.test(json.warning)
        ? json.warning
        : "",
    );
  }

  useEffect(() => {
    if (open) void loadSubs();
  }, [open]);

  useEffect(() => {
    setStartsOn(date);
  }, [date]);

  function pickClient(c: ClientRecord) {
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setPhone(c.phone || "");
    if (c.lastServiceIds?.length) setServiceIds([...c.lastServiceIds]);
    if (c.lastBarberId) setBarberId(c.lastBarberId);
    if (c.lastTimeLabel) setStartTime(c.lastTimeLabel);
  }

  async function createSub(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          barberId,
          serviceIds,
          weekday,
          startTime,
          startsOn,
          endsOn,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: number;
      };
      if (!res.ok) {
        setError(json.error || "Impossibile creare abbonamento.");
        return;
      }
      setError("");
      await loadSubs();
      onChanged();
      setOpen(false);
      if ((json.skipped || 0) > 0) {
        setWarning(`Creati ${json.created || 0} appuntamenti; ${json.skipped} saltati (conflitto).`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function stopSub(id: string) {
    if (!window.confirm("Disattiva abbonamento e annulla le date future? Le date già passate restano in storico.")) {
      return;
    }
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, cancelFuture: true }),
    });
    if (res.ok) {
      await loadSubs();
      onChanged();
    }
  }

  return (
    <section className="subscription-panel" aria-label="Abbonamenti cadenza fissa">
      <div className="crm-toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="font-serif">Abbonamento</h2>
          <p className="slot-status">
            Cadenza fissa giorno+ora per il cliente. Se un giorno non va, sposta o elimina solo quella prenotazione in tabella.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Chiudi" : "Nuovo abbonamento"}
        </button>
      </div>
      {warning ? <p className="crm-warning">{warning}</p> : null}
      {open ? (
        <form className="subscription-form" onSubmit={(e) => void createSub(e)}>
          {clients.filter((c) => c.visitCount > 0).slice(0, 4).map((c) => (
            <button key={c.key} type="button" className="walkin-chip" onClick={() => pickClient(c)}>
              {c.name}
            </button>
          ))}
          <label>
            Nome
            <input className="input-lux" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label>
            Cognome
            <input className="input-lux" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label>
            Telefono
            <input className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
            Giorno
            <select className="input-lux" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAY_OPTIONS_IT.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Orario
            <input className="input-lux" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            Dal
            <input className="input-lux" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
          </label>
          <label>
            Al
            <input className="input-lux" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Servizi
            <select
              className="input-lux"
              value={serviceIds[0] || "taglio-standard"}
              onChange={(e) => setServiceIds([e.target.value])}
            >
              {SERVICES.filter((s) => s.active !== false).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="field-error" style={{ gridColumn: "1 / -1" }}>{error}</p> : null}
          <button type="submit" className="btn" disabled={saving || !firstName.trim()}>
            {saving ? "…" : "Crea abbonamento"}
          </button>
        </form>
      ) : null}
      {subs.length > 0 ? (
        <div className="subscription-list">
          {subs.map((s) => (
            <div key={s.id} className="subscription-row">
              <span>
                {s.firstName} {s.lastName} · {WEEKDAY_OPTIONS_IT.find((d) => d.value === s.weekday)?.label || s.weekday}{" "}
                {s.startTime} · fino al {s.endsOn}
              </span>
              <button type="button" className="btn btn-outline" onClick={() => void stopSub(s.id)}>
                Interrompi
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

