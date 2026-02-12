import * as React from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Sparkles, TimerReset } from "lucide-react";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import { SoftTextarea } from "@/components/SoftTextarea";
import { useCreateReflection } from "@/hooks/use-reflections";
import { useToast } from "@/hooks/use-toast";
import { todayKstYmd } from "@/lib/kst";

export default function Reflect() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const create = useCreateReflection();

  const [date] = React.useState(() => todayKstYmd());
  const [text, setText] = React.useState("");
  const chars = text.length;

  const prompt = `• 오늘 마음에 남은 장면은?\n• 잘한 선택 한 가지는?\n• 아쉬웠던 점 한 가지는?\n• 내일 아침, 가장 먼저 끝내고 싶은 일은?\n`;

  const canSubmit = text.trim().length > 0 && !create.isPending;

  const onSubmit = async () => {
    try {
      const res = await create.mutateAsync({ date, reflectionText: text.trim() });
      toast({
        title: "회고를 저장했어요",
        description: "이제 내일 아침 할 일을 정해볼까요?",
      });
      navigate(`/plan/${res.reflection.id}`);
    } catch (e: any) {
      toast({
        title: "저장에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <Shell>
      <Seo title="Morning Focus · 저녁 회고" description="네 가지 질문으로 하루를 돌아보세요." />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="EVENING REFLECTION"
          title="하루를 짧게 돌아봐요"
          description="길게 쓸 필요 없어요. 떠오르는 대로 편하게 적어 주세요."
          testId="reflect-heading"
          right={
            <div className="rounded-2xl border border-border/60 bg-muted/25 px-4 py-3">
              <div className="text-[11px] font-semibold text-muted-foreground">날짜</div>
              <div className="mt-1 text-sm font-semibold text-foreground/90" data-testid="reflect-date">
                {date}
              </div>
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
                  <Sparkles className="h-4 w-4 text-primary" />
                  네 가지 질문
                </div>
                <pre
                  className="mt-3 whitespace-pre-wrap rounded-2xl border border-border/60 bg-background/10 p-4 text-sm leading-relaxed text-muted-foreground"
                  data-testid="reflect-prompt"
                >
                  {prompt}
                </pre>
              </div>
              <div className="hidden md:block shrink-0">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border/60 bg-muted/20">
                  <TimerReset className="h-5 w-5 text-accent/90" />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground/95">회고 작성</div>
                <div className="text-xs text-muted-foreground" data-testid="reflect-charcount">
                  {chars.toLocaleString()}자
                </div>
              </div>

              <SoftTextarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="짧아도 괜찮아요. 지금 떠오르는 것부터…"
                rows={10}
                data-testid="reflect-textarea"
              />

              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  저장 후 AI 피드백과 내일 계획으로 이어져요.
                </div>

                <button
                  type="button"
                  className="btn-premium focus-ring w-full sm:w-auto"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  data-testid="reflect-submit"
                >
                  {create.isPending ? "저장 중…" : "저장하기"}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6 hidden lg:block">
            <div className="text-sm font-semibold text-foreground/95">작성 가이드</div>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-semibold text-foreground/90">간결하게</div>
                <div className="mt-1">
                  두세 문장이면 충분해요. 핵심만 남기는 게 포인트예요.
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-semibold text-foreground/90">구체적으로</div>
                <div className="mt-1">
                  "내일 아침 가장 먼저 할 일"은 구체적인 행동으로 적어 주세요.
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-semibold text-foreground/90">부담 없이</div>
                <div className="mt-1">
                  완벽한 계획보다 다음 한 걸음이 중요해요.
                </div>
              </div>
            </div>
          </div>
        </div>

        {create.error ? (
          <div className="mt-6 glass-card p-5" data-testid="reflect-error">
            <div className="text-sm font-semibold text-foreground/90">오류가 발생했어요</div>
            <div className="mt-2 text-sm text-muted-foreground">{String(create.error)}</div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
