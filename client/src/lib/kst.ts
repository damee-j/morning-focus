const KST_OFFSET_MS = 9 * 3600 * 1000;

export function toKstHHMM(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseKstTime(scheduleDateYmd: string, hhmm: string): Date {
  const [year, month, day] = scheduleDateYmd.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const kstMidnight = utcMidnight - KST_OFFSET_MS;
  return new Date(kstMidnight + (h || 0) * 3600000 + (m || 0) * 60000);
}

export function fmtKstRange(start: Date, end: Date): string {
  return `${toKstHHMM(start)} – ${toKstHHMM(end)}`;
}

export function todayKstYmd(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
