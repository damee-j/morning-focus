import * as React from "react";
import { ChevronDown, ChevronUp, CircleCheck, CircleDashed, Flame, MessageCircle, CalendarClock } from "lucide-react";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import { useReflections, useStreak, useToggleCompleted } from "@/hooks/use-reflections";
import { cn } from "@/lib/utils";
import { toKstHHMM } from "@/lib/kst";
import { useToast } from "@/hooks/use-toast";

function fmtDateK(dateYmd: string) {
  return dateYmd.replaceAll("-", ".");
}

function fmtTime(iso: string) {
  return toKstHHMM(new Date(iso));
}

export default function History() {
  const { toast } = useToast();
  const { data, isLoading, error } = useReflections();
  const { data: streak } = useStreak();

  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <Shell>
      <Seo title="Morning Focus · 기록" description="회고, AI 피드백, 캘린더 블록 기록" />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="HISTORY"
          title="지금까지의 기록"
          description="회고, AI 피드백, 캘린더 블록을 날짜별로 확인하고 완료 여부를 체크하세요."
          testId="history-heading"
          right={
            <div className="glass-card px-5 py-4" data-testid="history-streak-card">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border/70 bg-muted/20">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">연속 기록</div>
                  <div className="mt-1 text-lg font-semibold text-foreground/95">
                    {streak?.streak ?? 0}일
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="glass-card p-6" data-testid="history-loading">
              <div className="space-y-3">
                <div className="h-4 w-1/2 rounded shimmer" />
                <div className="h-3 w-5/6 rounded shimmer" />
                <div className="h-3 w-2/3 rounded shimmer" />
              </div>
            </div>
          ) : error ? (
            <div className="glass-card p-6" data-testid="history-error">
              <div className="text-sm font-semibold text-foreground/90">불러오기에 실패했어요</div>
              <div className="mt-2 text-sm text-muted-foreground">{String(error)}</div>
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="glass-card p-10 text-center" data-testid="history-empty">
              <div className="text-lg font-semibold text-foreground/95">아직 기록이 없어요</div>
              <div className="mt-2 text-sm text-muted-foreground">오늘 밤 첫 회고를 남겨보세요.</div>
            </div>
          ) : (
            data!.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                expanded={openId === item.id}
                onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
                onToast={(t) => toast(t as any)}
              />
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}

function HistoryItem({
  item,
  expanded,
  onToggle,
  onToast,
}: {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  onToast: (t: { title: string; description?: string; variant?: any }) => void;
}) {
  const toggle = useToggleCompleted(item.id);

  const handleToggle = async () => {
    try {
      await toggle.mutateAsync({ completed: !item.completed });
      onToast({
        title: item.completed ? "완료 체크를 해제했어요" : "완료로 체크했어요",
      });
    } catch (e: any) {
      onToast({
        title: "변경에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "glass-card overflow-hidden transition-all duration-200",
        expanded && "ring-1 ring-primary/30",
      )}
      data-testid={`history-item-${item.id}`}
    >
      <div className="flex w-full items-center gap-3 p-4 sm:p-5">
        <button
          type="button"
          className="shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          disabled={toggle.isPending}
          data-testid={`history-check-${item.id}`}
        >
          {item.completed ? (
            <CircleCheck className="h-5 w-5 text-emerald-400" />
          ) : (
            <CircleDashed className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 rounded-lg"
          onClick={onToggle}
          data-testid={`history-toggle-${item.id}`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground/95">{fmtDateK(item.date)}</span>
            {item.topTask ? (
              <span className="truncate text-xs text-muted-foreground">
                {item.topTask}
              </span>
            ) : null}
          </div>
          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {item.reflectionText}
          </div>
        </button>

        <button
          type="button"
          className="shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 rounded-lg p-1"
          onClick={onToggle}
          data-testid={`history-expand-${item.id}`}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-border/60 p-4 sm:p-5 space-y-4" data-testid={`history-detail-${item.id}`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              회고 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {item.reflectionText}
            </div>
          </div>

          {item.aiFeedback ? (
            <div>
              <div className="text-xs font-semibold text-muted-foreground">AI 피드백</div>
              <div className="mt-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm leading-relaxed text-foreground/90">
                {item.aiFeedback}
              </div>
            </div>
          ) : null}

          {item.blocks && item.blocks.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                캘린더 블록
              </div>
              <div className="mt-2 space-y-2">
                {item.blocks.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/10 p-3 text-sm"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/25 text-xs font-bold text-foreground/90">
                      {b.blockIndex}
                    </div>
                    <span className="text-foreground/90">
                      {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
              예상 시간: <span className="font-semibold text-foreground/90">{item.estimatedDurationMinutes}분</span>
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 font-semibold",
                item.completed
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-border/60 bg-muted/20",
              )}
            >
              {item.completed ? "완료" : "진행 중"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
