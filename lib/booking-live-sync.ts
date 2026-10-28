/** Cross-tab / same-device live sync between gestionale and public booking. */

export const BOOKING_AGENDA_SYNC_KEY = "polese-agenda-rev";
export const BOOKING_AGENDA_SYNC_CHANNEL = "polese-agenda-sync";

/** Call after gestionale mutations that change chair availability. */
export function notifyAgendaChanged(reason = "agenda"): void {
  if (typeof window === "undefined") return;
  const stamp = String(Date.now());
  try {
    window.localStorage.setItem(BOOKING_AGENDA_SYNC_KEY, stamp);
  } catch {
    /* private mode / quota */
  }
  try {
    const ch = new BroadcastChannel(BOOKING_AGENDA_SYNC_CHANNEL);
    ch.postMessage({ reason, at: stamp });
    ch.close();
  } catch {
    /* unsupported */
  }
  try {
    window.dispatchEvent(
      new CustomEvent("polese-agenda-changed", { detail: { reason, at: stamp } }),
    );
  } catch {
    /* ignore */
  }
}

type AgendaListener = () => void;

/** Subscribe to agenda changes + mobile bfcache / tab focus. Returns cleanup. */
export function subscribeAgendaLiveReload(onReload: AgendaListener): () => void {
  if (typeof window === "undefined") return () => {};

  let last = "";
  try {
    last = window.localStorage.getItem(BOOKING_AGENDA_SYNC_KEY) || "";
  } catch {
    last = "";
  }

  let timer: number | null = null;
  const reload = () => {
    if (timer != null) window.clearTimeout(timer);
    // Debounce: iOS often fires pageshow + visibilitychange together.
    timer = window.setTimeout(() => {
      timer = null;
      onReload();
    }, 120);
  };

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== BOOKING_AGENDA_SYNC_KEY) return;
    if (ev.newValue && ev.newValue !== last) {
      last = ev.newValue;
      reload();
    }
  };

  const onVis = () => {
    if (document.visibilityState === "visible") reload();
  };

  const onPageShow = (ev: PageTransitionEvent) => {
    // iOS Safari restores pages from bfcache without remounting React.
    if (ev.persisted) reload();
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(BOOKING_AGENDA_SYNC_CHANNEL);
    channel.onmessage = () => reload();
  } catch {
    channel = null;
  }

  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("polese-agenda-changed", reload);

  return () => {
    if (timer != null) window.clearTimeout(timer);
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("polese-agenda-changed", reload);
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}
