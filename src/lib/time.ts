// The auction runs on Kyiv time no matter where an admin's laptop is.
export const TIME_ZONE = "Europe/Kyiv";

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function kyivFields(date: Date) {
  const f = Object.fromEntries(parts.formatToParts(date).map((p) => [p.type, p.value]));
  return { y: +f.year!, m: +f.month!, d: +f.day!, h: +f.hour!, min: +f.minute!, s: +f.second! };
}

/** Minutes Kyiv is ahead of UTC at that instant (120 in winter, 180 in summer). */
function kyivOffset(date: Date) {
  const k = kyivFields(date);
  return (Date.UTC(k.y, k.m - 1, k.d, k.h, k.min, k.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/** "2026-11-14T12:00" typed as Kyiv time -> the exact instant. */
export function fromKyivInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const naive = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  // Correct twice so times next to a daylight-saving switch land on the right offset.
  let t = naive - kyivOffset(new Date(naive)) * 60000;
  t = naive - kyivOffset(new Date(t)) * 60000;
  return new Date(t);
}

/** An instant -> "2026-11-14T12:00" in Kyiv time, for <input type="datetime-local">. */
export function toKyivInput(value: string | Date): string {
  const k = kyivFields(new Date(value));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.y}-${p(k.m)}-${p(k.d)}T${p(k.h)}:${p(k.min)}`;
}

const dateTime = new Intl.DateTimeFormat("uk-UA", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateTimeSec = new Intl.DateTimeFormat("uk-UA", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** 14.11.2026, 12:00 */
export const formatKyiv = (value: string | Date) => dateTime.format(new Date(value));
/** 14.11, 11:59:58 — for bids, where seconds matter. */
export const formatKyivPrecise = (value: string | Date) => dateTimeSec.format(new Date(value));

/** "2 год 15 хв", "4 хв", "завершено" */
export function formatTimeLeft(until: string | Date, now = new Date()) {
  const ms = new Date(until).getTime() - now.getTime();
  if (ms <= 0) return "завершено";
  const min = Math.ceil(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d) return `${d} д ${h} год`;
  if (h) return `${h} год ${m} хв`;
  return `${m} хв`;
}
