export type BusySlot = { start: Date; end: Date };

export type PreviewScheduleBlock = {
  startTimeIso: string;
  endTimeIso: string;
  blockIndex: number;
  totalBlocks: number;
};

function clampToWindow(d: Date, windowStart: Date, windowEnd: Date) {
  if (d < windowStart) return new Date(windowStart);
  if (d > windowEnd) return new Date(windowEnd);
  return d;
}

function mergeBusy(slots: BusySlot[]): BusySlot[] {
  const sorted = [...slots]
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: BusySlot[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ start: new Date(s.start), end: new Date(s.end) });
      continue;
    }
    if (s.start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), s.end.getTime()));
    } else {
      merged.push({ start: new Date(s.start), end: new Date(s.end) });
    }
  }
  return merged;
}

function getFreeGaps(windowStart: Date, windowEnd: Date, busySlots: BusySlot[]) {
  const merged = mergeBusy(
    busySlots
      .map((b) => ({
        start: clampToWindow(b.start, windowStart, windowEnd),
        end: clampToWindow(b.end, windowStart, windowEnd),
      }))
      .filter((b) => b.end > windowStart && b.start < windowEnd),
  );

  const gaps: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(windowStart);

  for (const b of merged) {
    if (b.start > cursor) {
      gaps.push({ start: new Date(cursor), end: new Date(b.start) });
    }
    cursor = new Date(Math.max(cursor.getTime(), b.end.getTime()));
  }

  if (cursor < windowEnd) {
    gaps.push({ start: new Date(cursor), end: new Date(windowEnd) });
  }

  return gaps.filter((g) => g.end > g.start);
}

function minutesBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}

export function buildSchedulePreview(input: {
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  busySlots: BusySlot[];
  minBlockMinutes: number;
}): PreviewScheduleBlock[] {
  const { windowStart, windowEnd, durationMinutes, busySlots, minBlockMinutes } =
    input;

  const gaps = getFreeGaps(windowStart, windowEnd, busySlots);

  let remaining = durationMinutes;

  for (const g of gaps) {
    if (minutesBetween(g.start, g.end) >= remaining) {
      const start = g.start;
      const end = addMinutes(start, remaining);
      return [
        {
          startTimeIso: start.toISOString(),
          endTimeIso: end.toISOString(),
          blockIndex: 1,
          totalBlocks: 1,
        },
      ];
    }
  }

  const blocks: Array<{ start: Date; end: Date }> = [];

  for (const g of gaps) {
    if (remaining <= 0) break;
    const gapMinutes = minutesBetween(g.start, g.end);
    if (gapMinutes < minBlockMinutes) continue;

    const take = Math.min(remaining, gapMinutes);
    const roundedTake = Math.max(
      minBlockMinutes,
      Math.floor(take / minBlockMinutes) * minBlockMinutes,
    );

    const start = g.start;
    const end = addMinutes(start, roundedTake);
    blocks.push({ start, end });
    remaining -= roundedTake;
  }

  const totalBlocks = blocks.length || 1;
  return blocks.map((b, idx) => ({
    startTimeIso: b.start.toISOString(),
    endTimeIso: b.end.toISOString(),
    blockIndex: idx + 1,
    totalBlocks,
  }));
}

export function buildWindowDates(
  scheduleDate: string,
  hoursStart: number,
  hoursEnd: number,
  tzOffsetMinutes: number = -540,
): { windowStart: Date; windowEnd: Date } {
  const [year, month, day] = scheduleDate.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const midnightLocal = midnightUtc + tzOffsetMinutes * 60 * 1000;
  const windowStart = new Date(midnightLocal + hoursStart * 3600 * 1000);
  const windowEnd = new Date(midnightLocal + hoursEnd * 3600 * 1000);
  return { windowStart, windowEnd };
}
