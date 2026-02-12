import * as React from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowRight, BrainCircuit, Clock3, Sparkles, Wand2 } from "lucide-react";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import { SoftInput } from "@/components/SoftInput";
import { usePlanTask } from "@/hooks/use-reflections";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRESETS = [30, 60, 90, 120, 180];

export default function Plan() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const plan = usePlanTask(id);

  const [topTask, setTopTask] = React.useState("");
  const [picked, setPicked] = React.useState<number | "custom" | null>(60);
  const [custom, setCustom] = React.useState<string>("");

  const durationMinutes = React.useMemo(() => {
    if (picked === "custom") {
      const n = Number(custom);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (typeof picked === "number") return picked;
    return undefined;
  }, [picked, custom]);

  const canSubmit = topTask.trim().length > 0 && !plan.isPending;

  const onSubmit = async () => {
    try {
      const res = await plan.mutateAsync({
        topTask: topTask.trim(),
        durationMinutes,
      });
      toast({
        title: "내일 계획을 정했어요",
        description: "이제 캘린더 블록을 확인해 볼까요?",
      });
      navigate(`/schedule/${id}`, { state: res } as any);
    } catch (e: any) {
      toast({
        title: "계획 생성에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  const ai = plan.data;

  return (
    <Shell
      headerRight={
        <Link href="/history" className="btn-ghosty focus-ring" data-testid="plan-go-history">
          기록
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <Seo title="Morning Focus · 내일 계획" description="AI 피드백을 바탕으로 내일 아침 할 일을 정하세요." />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="AI FEEDBACK + PLANNING"
          title="내일 아침, 가장 먼저 할 일은?"
          description="회고를 바탕으로 AI가 짧은 피드백을 드려요. 내일의 첫 번째 할 일을 정해 보세요."
          testId="plan-heading"
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_.9fr]">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
                  <BrainCircuit className="h-4 w-4 text-accent" />
                  AI 피드백
                </div>
                <div className="mt-3 rounded-2xl border border-border/60 bg-background/10 p-4">
                  {plan.isPending && !ai ? (
                    <div className="space-y-2" data-testid="plan-ai-loading">
                      <div className="h-4 w-5/6 rounded shimmer" />
                      <div className="h-4 w-2/3 rounded shimmer" />
                      <div className="h-4 w-3/4 rounded shimmer" />
                    </div>
                  ) : ai ? (
                    <div className="space-y-3" data-testid="plan-ai-content">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {ai.aiFeedback}
                      </p>
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground/90">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Sparkles className="h-4 w-4" />
                          한 가지 질문
                        </div>
                        <div className="mt-2 text-sm">{ai.followUpQuestion}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
                          AI 추천 시간: <span className="text-foreground/90 font-semibold">{ai.suggestedDurationMinutes}분</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground" data-testid="plan-ai-empty">
                      아래에서 내일 할 일을 입력하고 "AI 피드백 받기"를 눌러 주세요.
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:block shrink-0">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/60 bg-muted/20">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            {plan.error ? (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground/90" data-testid="plan-error">
                {String(plan.error)}
              </div>
            ) : null}
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="text-sm font-semibold text-foreground/95" data-testid="plan-form-title">
              내일 아침 가장 먼저 할 일
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              "완료" 기준이 분명한 행동으로 적어 주세요.
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">할 일</div>
              <SoftInput
                value={topTask}
                onChange={(e) => setTopTask(e.target.value)}
                placeholder="예: 제안서 1페이지 초안 작성"
                data-testid="plan-top-task"
              />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock3 className="h-4 w-4 text-primary" />
                  예상 소요 시간
                </div>
                {ai?.suggestedDurationMinutes ? (
                  <div className="text-xs text-muted-foreground" data-testid="plan-suggested">
                    AI 추천: <span className="text-foreground/90 font-semibold">{ai.suggestedDurationMinutes}분</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2" data-testid="plan-presets">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                      picked === m
                        ? "bg-primary text-primary-foreground shadow-[0_18px_60px_rgba(251,191,36,.18)]"
                        : "bg-muted/35 text-foreground/90 border border-border/70 hover:bg-muted/60 hover:-translate-y-0.5",
                    )}
                    onClick={() => setPicked(m)}
                    data-testid={`plan-preset-${m}`}
                  >
                    {m}분
                  </button>
                ))}
                <button
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                    picked === "custom"
                      ? "bg-primary text-primary-foreground shadow-[0_18px_60px_rgba(251,191,36,.18)]"
                      : "bg-muted/35 text-foreground/90 border border-border/70 hover:bg-muted/60 hover:-translate-y-0.5",
                  )}
                  onClick={() => setPicked("custom")}
                  data-testid="plan-preset-custom"
                >
                  직접 입력
                </button>
              </div>

              {picked === "custom" ? (
                <div className="mt-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">분 단위</div>
                  <SoftInput
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="예: 75"
                    data-testid="plan-custom-minutes"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/reflect" className="btn-ghosty focus-ring" data-testid="plan-back">
                이전으로
              </Link>

              <button
                type="button"
                className="btn-premium focus-ring w-full sm:w-auto"
                onClick={onSubmit}
                disabled={!canSubmit}
                data-testid="plan-submit"
              >
                {plan.isPending ? "생성 중…" : "AI 피드백 받기"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              다음 단계에서 캘린더 블록을 미리보고 확정할 수 있어요.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
