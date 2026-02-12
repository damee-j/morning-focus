import * as React from "react";
import { Clock, MinusCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewScheduleBlock } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toKstHHMM, parseKstTime, fmtKstRange } from "@/lib/kst";

function generateTimeOptions() {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function TimeDropdown({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  const nearest = React.useMemo(() => {
    const [h, m] = value.split(":").map(Number);
    const totalMin = h * 60 + m;
    const floored = Math.floor(totalMin / 15) * 15;
    const rh = Math.floor(floored / 60);
    const rm = floored % 60;
    if (rh >= 24) return "23:45";
    return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
  }, [value]);

  return (
    <Select value={nearest} onValueChange={onChange}>
      <SelectTrigger
        className="focus-ring rounded-xl border-2 border-border/70 bg-background/20 text-sm"
        data-testid={testId}
      >
        <SelectValue placeholder="시간" />
      </SelectTrigger>
      <SelectContent className="glass-card border-border/70 max-h-[240px]">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t} data-testid={`${testId}-${t}`}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function TimelineBlocksEditor({
  scheduleDate,
  blocks,
  onChange,
  testIdPrefix = "blocks-editor",
}: {
  scheduleDate: string;
  blocks: PreviewScheduleBlock[];
  onChange: (blocks: PreviewScheduleBlock[]) => void;
  testIdPrefix?: string;
}) {
  const sorted = React.useMemo(
    () => [...blocks].sort((a, b) => a.blockIndex - b.blockIndex),
    [blocks],
  );

  const handleTimeChange = (idx: number, key: "startTimeIso" | "endTimeIso", hhmm: string) => {
    const newDate = parseKstTime(scheduleDate, hhmm).toISOString();
    const next = sorted.map((b, i) => (i === idx ? { ...b, [key]: newDate } : b));
    onChange(reindex(next));
  };

  const handleRemove = (idx: number) => {
    const next = sorted.filter((_, i) => i !== idx);
    onChange(reindex(next));
  };

  const handleAdd = () => {
    const last = sorted[sorted.length - 1];
    const start = last ? new Date(last.endTimeIso) : parseKstTime(scheduleDate, "09:00");
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const next: PreviewScheduleBlock[] = [
      ...sorted,
      {
        startTimeIso: start.toISOString(),
        endTimeIso: end.toISOString(),
        blockIndex: sorted.length + 1,
        totalBlocks: sorted.length + 1,
      },
    ];
    onChange(reindex(next));
  };

  return (
    <div className="glass-card p-5" data-testid={`${testIdPrefix}-root`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
            <Clock className="h-4 w-4 text-primary" />
            블록 미리보기
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            시간을 수정하거나 블록을 추가/삭제할 수 있어요.
          </div>
        </div>
        <button
          type="button"
          className="btn-ghosty focus-ring"
          onClick={handleAdd}
          data-testid={`${testIdPrefix}-add`}
        >
          <PlusCircle className="h-4 w-4" />
          추가
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            블록이 없습니다. 위에서 미리보기를 생성해 주세요.
          </div>
        ) : null}

        {sorted.map((b, idx) => {
          const start = new Date(b.startTimeIso);
          const end = new Date(b.endTimeIso);
          const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

          return (
            <div
              key={`${b.blockIndex}-${b.startTimeIso}`}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border/60 bg-background/15 p-4",
                "transition-all duration-200 hover:border-border",
              )}
              data-testid={`${testIdPrefix}-item-${idx}`}
            >
              <div className="absolute -inset-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/25 text-xs font-bold text-foreground/90">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground/95">
                        {fmtKstRange(start, end)}
                      </div>
                      <div className="text-xs text-muted-foreground">{minutes}분</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghosty focus-ring shrink-0"
                    onClick={() => handleRemove(idx)}
                    data-testid={`${testIdPrefix}-remove-${idx}`}
                    aria-label="블록 삭제"
                  >
                    <MinusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">삭제</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-muted-foreground">시작</div>
                    <TimeDropdown
                      value={toKstHHMM(start)}
                      onChange={(v) => handleTimeChange(idx, "startTimeIso", v)}
                      testId={`${testIdPrefix}-start-${idx}`}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-muted-foreground">종료</div>
                    <TimeDropdown
                      value={toKstHHMM(end)}
                      onChange={(v) => handleTimeChange(idx, "endTimeIso", v)}
                      testId={`${testIdPrefix}-end-${idx}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        블록 사이에 5~10분 여유를 두면 아침 루틴이 더 편안해요.
      </div>
    </div>
  );
}

function reindex(blocks: PreviewScheduleBlock[]): PreviewScheduleBlock[] {
  const total = blocks.length;
  return blocks
    .sort((a, b) => new Date(a.startTimeIso).getTime() - new Date(b.startTimeIso).getTime())
    .map((b, i) => ({
      ...b,
      blockIndex: i + 1,
      totalBlocks: total,
    }));
}
