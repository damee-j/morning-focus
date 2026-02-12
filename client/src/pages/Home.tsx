import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Circle, Flame, Plus, Target, Wand2 } from "lucide-react";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import MetricCard from "@/components/MetricCard";
import { useStreak, useReflections, useToggleCompleted } from "@/hooks/use-reflections";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toKstHHMM, todayKstYmd } from "@/lib/kst";

function TodayTopTask({ reflection }: { reflection: any }) {
  const { toast } = useToast();
  const toggle = useToggleCompleted(reflection.id);

  const handleToggle = () => {
    toggle.mutate(
      { completed: !reflection.completed },
      {
        onError: (e: any) => {
          toast({
            title: "상태 변경에 실패했어요",
            description: e?.message ?? "잠시 후 다시 시도해 주세요.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const block = reflection.blocks?.[0];
  const timeLabel = block
    ? `${toKstHHMM(new Date(block.startTime))} – ${toKstHHMM(new Date(block.endTime))}`
    : reflection.estimatedDurationMinutes
      ? `약 ${reflection.estimatedDurationMinutes}분`
      : null;

  return (
    <div className="glass-card p-5 sm:p-6" data-testid="home-top-task">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold text-foreground/95">오늘의 가장 중요한 일</div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 rounded-full transition-colors"
          onClick={handleToggle}
          disabled={toggle.isPending}
          data-testid="home-top-task-toggle"
        >
          {reflection.completed ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          ) : (
            <Circle className="h-7 w-7 text-muted-foreground/60" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-base font-semibold leading-snug transition-colors",
              reflection.completed ? "text-muted-foreground line-through" : "text-foreground/95",
            )}
            data-testid="home-top-task-title"
          >
            {reflection.topTask}
          </div>
          {timeLabel ? (
            <div className="mt-1 text-xs text-muted-foreground" data-testid="home-top-task-time">
              {timeLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: streak, isLoading: streakLoading, error: streakError } = useStreak();
  const { data: history, isLoading: historyLoading } = useReflections();

  const latest = history?.[0];
  const today = todayKstYmd();
  const todayReflection = history?.find((r) => r.date === today);
  const hasTopTask = todayReflection?.topTask && todayReflection.topTask.length > 0;

  const registerHref = todayReflection && !hasTopTask
    ? `/plan/${todayReflection.id}`
    : "/reflect";

  return (
    <Shell
      headerRight={
        <Link
          href="/reflect"
          className="btn-premium focus-ring"
          data-testid="home-cta-reflect"
        >
          회고 시작
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <Seo title="Morning Focus" description="저녁에 짧게 정리하고, 내일 아침을 가볍게 시작하세요." />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="CALM NIGHT MODE"
          title="오늘 하루, 어떠셨나요?"
          description="저녁에 네 가지 질문으로 하루를 돌아보고, 내일 아침 가장 먼저 할 일을 캘린더에 등록해 두세요."
          testId="home-heading"
          right={
            <div className="flex items-center gap-2">
              <Link
                href="/history"
                className="btn-ghosty focus-ring"
                data-testid="home-go-history"
              >
                지난 기록
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="btn-ghosty focus-ring hidden sm:inline-flex"
                data-testid="home-go-settings"
              >
                설정
              </Link>
            </div>
          }
        />

        {/* 1. 오늘의 가장 중요한 일 */}
        <div className="mt-6">
          {historyLoading ? (
            <div className="glass-card p-5 sm:p-6">
              <div className="space-y-2" data-testid="home-top-task-loading">
                <div className="h-4 w-1/3 rounded shimmer" />
                <div className="h-5 w-2/3 rounded shimmer" />
              </div>
            </div>
          ) : hasTopTask && todayReflection ? (
            <TodayTopTask reflection={todayReflection} />
          ) : (
            <div className="glass-card p-5 sm:p-6" data-testid="home-top-task-empty">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold text-foreground/95">오늘의 가장 중요한 일</div>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                아직 오늘의 중요한 일이 등록되지 않았어요.
              </div>
              <Link
                href={registerHref}
                className="btn-ghosty focus-ring"
                data-testid="home-top-task-register"
              >
                <Plus className="h-4 w-4" />
                등록하기
              </Link>
            </div>
          )}
        </div>

        {/* 2. 오늘 밤 회고 + 최근 기록 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-foreground/95">오늘 밤 회고</div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {todayReflection
                    ? "오늘 회고를 이미 남겼어요. 내일 계획도 함께 확인해 보세요."
                    : "네 가지 질문에 짧게 답하는 것만으로 충분해요."}
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border/70 bg-muted/20">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/reflect"
                className="btn-premium focus-ring"
                data-testid="home-start-reflect"
              >
                회고 작성하기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className={cn("text-xs text-muted-foreground", "sm:ml-2")}>
                저장하면 AI 피드백과 일정 미리보기가 이어져요.
              </div>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="text-sm font-semibold text-foreground/95">최근 기록</div>
            <div className="mt-2 text-sm text-muted-foreground">
              지난 회고와 캘린더 블록을 한눈에 확인하세요.
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/10 p-4">
              {historyLoading ? (
                <div className="space-y-2" data-testid="home-history-loading">
                  <div className="h-4 w-2/3 rounded shimmer" />
                  <div className="h-3 w-5/6 rounded shimmer" />
                  <div className="h-3 w-1/2 rounded shimmer" />
                </div>
              ) : latest ? (
                <div data-testid="home-history-latest">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-foreground/95">{latest.date}</div>
                    <div
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold border",
                        latest.completed
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : "border-border/60 bg-muted/20 text-muted-foreground",
                      )}
                    >
                      {latest.completed ? "완료" : "진행 중"}
                    </div>
                  </div>
                  <div className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {latest.reflectionText}
                  </div>

                  <div className="mt-4">
                    <Link
                      href="/history"
                      className="btn-ghosty focus-ring"
                      data-testid="home-open-history"
                    >
                      전체 기록 보기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground" data-testid="home-history-empty">
                  아직 기록이 없어요. 오늘 밤, 첫 회고를 남겨보세요.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. 메트릭 카드 (하단) */}
        <div className="mt-4">
          <MetricCard
            label="연속 기록"
            value={streakLoading ? "…" : `${streak?.streak ?? 0}일`}
            hint={streak?.latestDate ? `마지막 기록: ${streak.latestDate}` : "오늘 밤 첫 기록을 남겨보세요."}
            icon={<Flame className="h-5 w-5 text-primary" />}
            tone="amber"
            testId="home-metric-streak"
          />
        </div>

        {streakError ? (
          <div className="mt-4 glass-card p-5" data-testid="home-streak-error">
            <div className="text-sm font-semibold text-foreground/90">연속 기록을 불러오지 못했어요</div>
            <div className="mt-2 text-sm text-muted-foreground">{String(streakError)}</div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
