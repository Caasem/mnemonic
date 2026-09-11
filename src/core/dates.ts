// Date helpers — relative parsing/formatting for the quick-add "Learned" field
// and human-friendly display throughout the app.

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400000);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Parse informal relative date phrases into an ISO date-time (noon local, to avoid TZ edge issues). */
export function parseRelativeDate(phrase: string, now: Date = new Date()): string | null {
  const p = phrase.trim().toLowerCase();
  const base = startOfDay(now);
  base.setHours(12, 0, 0, 0);

  if (!p || p === "today" || p === "now") return base.toISOString();
  if (p === "yesterday") return addDays(base, -1).toISOString();
  if (p === "tomorrow") return addDays(base, 1).toISOString();

  const daysAgoMatch = p.match(/^(\d+)\s*d(ays?)?\s*ago$/);
  if (daysAgoMatch) return addDays(base, -parseInt(daysAgoMatch[1], 10)).toISOString();

  if (p === "last week") return addDays(base, -7).toISOString();
  const weeksAgoMatch = p.match(/^(\d+)\s*w(eeks?)?\s*ago$/);
  if (weeksAgoMatch) return addDays(base, -7 * parseInt(weeksAgoMatch[1], 10)).toISOString();

  if (p === "last month") return addDays(base, -30).toISOString();

  // Try native Date parsing for explicit dates like "2026-09-01" or "Sep 1"
  const parsed = new Date(phrase);
  if (!isNaN(parsed.getTime())) {
    const d = startOfDay(parsed);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  return null;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = daysBetween(d, now); // now - d, positive = past
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff === -1) return "tomorrow";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  if (diff < -1 && diff > -7) return `in ${-diff} days`;
  if (diff >= 7 && diff < 14) return "last week";
  if (diff <= -7 && diff > -14) return "next week";
  if (diff >= 14 && diff < 60) return `${Math.round(diff / 7)} weeks ago`;
  if (diff <= -14 && diff > -60) return `in ${Math.round(-diff / 7)} weeks`;
  if (diff >= 60) return `${Math.round(diff / 30)} months ago`;
  return `in ${Math.round(-diff / 30)} months`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isoDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function humanizeInterval(days: number): string {
  if (days < 1 / 24) return `${Math.round(days * 1440)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export const RELATIVE_DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last week", value: "last week" },
];
