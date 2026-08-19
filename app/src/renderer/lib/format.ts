// Display formatting helpers (ported from the Python overlay).

export function fmtCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

export function fmtDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtAgo(seconds: number | null): string {
  if (seconds === null) return "never";
  return `${fmtDuration(seconds)} ago`;
}

/** Live tab: last XP change, or reassurance when connected but the game has not saved XP yet. */
export function fmtXpUpdated(seconds: number | null): string {
  if (seconds === null) return "Waiting for game save…";
  return `XP updated ${fmtAgo(seconds)}`;
}

export function fmtClock(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const h24 = d.getHours();
  const h = h24 % 12 || 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  const hh = String(h).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} ${ampm}`;
}

/** Inventory fill prediction: duration until full, e.g. "45 min", "3.2 hours", "2d 5h". */
export function fmtHoursUntilFull(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hours`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h`;
}

/** Inventory fill prediction: clock time it will hit full, e.g. "today at 4:30 PM". */
export function fmtFillEta(hours: number, now: Date = new Date()): string {
  const eta = new Date(now.getTime() + hours * 3600 * 1000);
  const time = eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (eta.toDateString() === now.toDateString()) return `today at ${time}`;
  const dateStr = eta.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${dateStr} at ${time}`;
}
