import * as React from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowRight, CalendarCheck2, CalendarX2, Info, Sparkles } from "lucide-react";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import TimelineBlocksEditor from "@/components/TimelineBlocksEditor";
import { useConfirmSchedule, usePreviewSchedule } from "@/hooks/use-reflections";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import type { PreviewScheduleBlock } from "@shared/schema";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SoftInput } from "@/components/SoftInput";
import { cn } from "@/lib/utils";

function tomorrowYmd() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Schedule() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: settings } = useSettings();
  const preview = usePreviewSchedule(id);
  const confirm = useConfirmSchedule(id);

  const [scheduleDate, setScheduleDate] = React.useState(() => tomorrowYmd());
  const [durationMinutes, setDurationMinutes] = React.useState<number>(60);
  const [blocks, setBlocks] = React.useState<PreviewScheduleBlock[]>([]);
  const [provider, setProvider] = React.useState<"google" | "lark">("google");
  const [titleBase, setTitleBase] = React.useState<string>("Morning Focus");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const hoursStart = settings?.schedulableHoursStart;
  const hoursEnd = settings?.schedulableHoursEnd;

  const buildPreview = async () => {
    try {
      const res = await preview.mutateAsync({
        scheduleDate,
        durationMinutes,
        schedulableHoursStart: hoursStart,
        schedulableHoursEnd: hoursEnd,
      });
      setBlocks(res.blocks);
      setProvider(res.provider);
      setTitleBase(res.titleBase);
      toast({
        title: "미리보기를 생성했어요",
        description: "시간을 수정한 뒤 확정할 수 있어요.",
      });
    } catch (e: any) {
      toast({
        title: "미리보기 생성에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  const onConfirm = async () => {
    try {
      const res = await confirm.mutateAsync({ blocks });
      toast({
        title: "캘린더에 등록했어요",
        description: `${res.savedBlocks.length}개 블록을 추가했습니다.`,
      });
      navigate("/history");
    } catch (e: any) {
      toast({
        title: "등록에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <Shell
      headerRight={
        <button
          type="button"
          className="btn-premium focus-ring"
          onClick={buildPreview}
          disabled={preview.isPending}
          data-testid="schedule-preview-top"
        >
          {preview.isPending ? "생성 중…" : "미리보기"}
          <Sparkles className="h-4 w-4" />
        </button>
      }
    >
      <Seo title="Morning Focus · 일정 미리보기" description="내일 아침 집중 블록을 캘린더에 등록하세요." />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="SCHEDULE PREVIEW"
          title="내일 아침 일정을 잡아볼까요?"
          description="빈 시간에 맞춰 블록을 배치했어요. 시간을 조정한 뒤 확정하면 캘린더에 등록돼요."
          testId="schedule-heading"
          right={
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/history" className="btn-ghosty focus-ring" data-testid="schedule-go-history">
                기록
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="btn-premium focus-ring"
                onClick={buildPreview}
                disabled={preview.isPending}
                data-testid="schedule-preview"
              >
                {preview.isPending ? "생성 중…" : "미리보기 생성"}
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="glass-card p-5 sm:p-6">
            <div className="text-sm font-semibold text-foreground/95">미리보기 설정</div>
            <div className="mt-2 text-sm text-muted-foreground">
              날짜와 시간을 변경한 뒤 다시 생성할 수 있어요.
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">날짜</div>
                <SoftInput
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  data-testid="schedule-date"
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">총 시간 (분)</div>
                <SoftInput
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  data-testid="schedule-duration"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/15">
                  <Info className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground/90">스케줄 가능 시간대</div>
                  <div className="mt-1 text-sm text-muted-foreground" data-testid="schedule-hours">
                    {typeof hoursStart === "number" && typeof hoursEnd === "number"
                      ? `${hoursStart}:00 ~ ${hoursEnd}:00`
                      : "설정에서 지정할 수 있어요."}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    이 시간대의 빈 시간에 블록을 배치해요.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/plan/${id}`} className="btn-ghosty focus-ring" data-testid="schedule-back">
                이전으로
              </Link>
              <button
                type="button"
                className="btn-premium focus-ring w-full sm:w-auto"
                onClick={buildPreview}
                disabled={preview.isPending}
                data-testid="schedule-generate"
              >
                {preview.isPending ? "생성 중…" : "미리보기 생성"}
                <Sparkles className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-border/60 bg-background/10 p-4 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2" data-testid="schedule-provider">
                <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
                  캘린더: <span className="text-foreground/90 font-semibold">{provider === "google" ? "Google" : "Lark"}</span>
                </span>
                <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
                  제목: <span className="text-foreground/90 font-semibold">{titleBase}</span>
                </span>
              </div>
              <div className={cn("mt-2", provider === "lark" ? "text-amber-200/90" : "")}>
                {provider === "lark"
                  ? "Lark 캘린더는 아직 지원 준비 중이에요. 설정에서 Google을 선택해 주세요."
                  : "Google 캘린더에 블록을 등록합니다."}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <TimelineBlocksEditor
              scheduleDate={scheduleDate}
              blocks={blocks}
              onChange={setBlocks}
              testIdPrefix="schedule-blocks"
            />

            <div className="glass-card p-5 sm:p-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="btn-ghosty focus-ring"
                  onClick={() => {
                    setBlocks([]);
                    toast({ title: "초기화했어요", description: "미리보기를 다시 생성해 주세요." });
                  }}
                  data-testid="schedule-cancel"
                >
                  <CalendarX2 className="h-4 w-4" />
                  초기화
                </button>

                <button
                  type="button"
                  className="btn-premium focus-ring w-full sm:w-auto"
                  onClick={() => setConfirmOpen(true)}
                  disabled={blocks.length === 0 || confirm.isPending || provider !== "google"}
                  data-testid="schedule-confirm"
                >
                  {confirm.isPending ? "등록 중…" : "캘린더에 등록"}
                  <CalendarCheck2 className="h-4 w-4" />
                </button>
              </div>

              {provider !== "google" ? (
                <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100/90" data-testid="schedule-lark-warning">
                  Lark 캘린더는 준비 중이에요. 설정에서 Google을 선택해 주세요.
                </div>
              ) : null}

              {preview.error ? (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground/90" data-testid="schedule-preview-error">
                  {String(preview.error)}
                </div>
              ) : null}
              {confirm.error ? (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground/90" data-testid="schedule-confirm-error">
                  {String(confirm.error)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="이 블록으로 등록할까요?"
          description="확정하면 캘린더에 일정이 추가돼요. 나중에 캘린더에서 수정하거나 삭제할 수 있어요."
          confirmLabel="등록하기"
          cancelLabel="돌아가기"
          onConfirm={onConfirm}
          testIdPrefix="schedule-confirm-dialog"
        />
      </div>
    </Shell>
  );
}
