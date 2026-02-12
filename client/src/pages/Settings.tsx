import * as React from "react";
import { CalendarDays, Check, CheckCircle2, Clock, ExternalLink, Key, Link2Off, SlidersHorizontal } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import Shell from "@/components/Shell";
import Seo from "@/components/Seo";
import SectionHeading from "@/components/SectionHeading";
import { SoftInput } from "@/components/SoftInput";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useCalendarStatus, useGoogleDisconnect, useLarkDisconnect, useLarkSaveCredentials } from "@/hooks/use-calendar";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CalendarCard({
  name,
  icon,
  connected,
  onConnect,
  onDisconnect,
  disabled,
  disabledLabel,
  testIdPrefix,
  extra,
}: {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  testIdPrefix: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-colors",
        connected
          ? "border-emerald-400/30 bg-emerald-400/5"
          : disabled
            ? "border-border/40 bg-muted/10 opacity-60"
            : "border-border/60 bg-background/10",
      )}
      data-testid={`${testIdPrefix}-card`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/20">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground/95">{name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {connected ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : disabled ? (
                <span>{disabledLabel ?? "준비 중"}</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Link2Off className="h-3 w-3" />
                  연결 안 됨
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {extra}
          {connected && onDisconnect ? (
            <button
              type="button"
              className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              onClick={onDisconnect}
              data-testid={`${testIdPrefix}-disconnect`}
            >
              연결 해제
            </button>
          ) : null}
          {!connected && !disabled && onConnect ? (
            <button
              type="button"
              className="btn-premium focus-ring text-xs"
              onClick={onConnect}
              data-testid={`${testIdPrefix}-connect`}
            >
              연동하기
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { data, isLoading, error } = useSettings();
  const update = useUpdateSettings();
  const { data: calStatus, isLoading: calLoading } = useCalendarStatus();

  const [notificationTime, setNotificationTime] = React.useState("21:00");
  const [calendarProvider, setCalendarProvider] = React.useState<"google" | "lark">("google");
  const [start, setStart] = React.useState(9);
  const [end, setEnd] = React.useState(19);
  const [language, setLanguage] = React.useState<"ko" | "en">("ko");

  React.useEffect(() => {
    if (!data) return;
    if (data.notificationTime != null) setNotificationTime(data.notificationTime);
    if (data.calendarProvider != null) setCalendarProvider(data.calendarProvider);
    if (data.schedulableHoursStart != null) setStart(data.schedulableHoursStart);
    if (data.schedulableHoursEnd != null) setEnd(data.schedulableHoursEnd);
    if (data.language != null) setLanguage(data.language);
  }, [data]);

  const canSave = !update.isPending && !isLoading;

  const save = async () => {
    try {
      await update.mutateAsync({
        notificationTime,
        calendarProvider,
        schedulableHoursStart: start,
        schedulableHoursEnd: end,
        language,
      });
      toast({ title: "설정을 저장했어요" });
    } catch (e: any) {
      toast({
        title: "저장에 실패했어요",
        description: e?.message ?? "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  const googleDisconnect = useGoogleDisconnect();
  const larkDisconnect = useLarkDisconnect();
  const larkSaveCredentials = useLarkSaveCredentials();

  const [showLarkSetup, setShowLarkSetup] = React.useState(false);
  const [larkAppIdInput, setLarkAppIdInput] = React.useState("");
  const [larkAppSecretInput, setLarkAppSecretInput] = React.useState("");

  const handleGoogleConnect = async () => {
    try {
      await fetch("/api/calendar/google/enable", { method: "POST", credentials: "include" });
    } catch {}
    window.open("/__replit/connector/google-calendar", "_blank");
  };

  const handleGoogleDisconnect = async () => {
    try {
      await googleDisconnect.mutateAsync();
      toast({ title: "Google Calendar 연결을 해제했어요" });
    } catch {
      toast({ title: "연결 해제에 실패했어요", variant: "destructive" });
    }
  };

  const larkHasCredentials = calStatus?.lark?.hasCredentials === true;

  const handleLarkConnect = async () => {
    if (!larkHasCredentials) {
      setShowLarkSetup(true);
      return;
    }
    await startLarkOAuth();
  };

  const startLarkOAuth = async () => {
    try {
      const res = await fetch("/api/calendar/lark/auth-url", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "알 수 없는 오류" }));
        toast({
          title: "Lark 연동 실패",
          description: err.message,
          variant: "destructive",
        });
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      toast({ title: "Lark 연동 실패", variant: "destructive" });
    }
  };

  const handleSaveLarkCredentials = async () => {
    if (!larkAppIdInput.trim() || !larkAppSecretInput.trim()) {
      toast({ title: "App ID와 App Secret을 모두 입력해 주세요.", variant: "destructive" });
      return;
    }
    try {
      await larkSaveCredentials.mutateAsync({
        larkAppId: larkAppIdInput.trim(),
        larkAppSecret: larkAppSecretInput.trim(),
      });
      toast({ title: "Lark 인증 정보를 저장했어요" });
      setShowLarkSetup(false);
      setLarkAppIdInput("");
      setLarkAppSecretInput("");
      await startLarkOAuth();
    } catch {
      toast({ title: "저장에 실패했어요", variant: "destructive" });
    }
  };

  const handleLarkDisconnect = async () => {
    try {
      await larkDisconnect.mutateAsync();
      toast({ title: "Lark 연결을 해제했어요" });
    } catch {
      toast({ title: "연결 해제에 실패했어요", variant: "destructive" });
    }
  };

  const googleConnected = calStatus?.google?.connected === true;
  const larkConnected = calStatus?.lark?.connected === true;

  return (
    <Shell>
      <Seo title="Morning Focus · 설정" description="알림 시각, 캘린더, 스케줄 가능 시간을 설정하세요." />

      <div className="animate-float-in">
        <SectionHeading
          eyebrow="SETTINGS"
          title="내 환경 설정"
          description="알림 시각, 캘린더, 스케줄 가능 시간대를 설정할 수 있어요."
          testId="settings-heading"
          right={
            <button
              type="button"
              className="btn-premium focus-ring"
              onClick={save}
              disabled={!canSave}
              data-testid="settings-save-top"
            >
              {update.isPending ? "저장 중…" : "저장"}
              <Check className="h-4 w-4" />
            </button>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_.9fr]">
          <div className="glass-card p-5 sm:p-6">
            {isLoading ? (
              <div className="space-y-3" data-testid="settings-loading">
                <div className="h-4 w-1/2 rounded shimmer" />
                <div className="h-3 w-5/6 rounded shimmer" />
                <div className="h-10 w-full rounded shimmer" />
              </div>
            ) : error ? (
              <div data-testid="settings-error">
                <div className="text-sm font-semibold text-foreground/90">불러오기에 실패했어요</div>
                <div className="mt-2 text-sm text-muted-foreground">{String(error)}</div>
              </div>
            ) : (
              <div className="space-y-6" data-testid="settings-form">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
                    <Clock className="h-4 w-4 text-primary" />
                    알림 시각
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    매일 이 시각에 저녁 회고를 떠올릴 수 있도록 저장해요.
                  </div>
                  <div className="mt-3 max-w-xs">
                    <SoftInput
                      type="time"
                      value={notificationTime}
                      onChange={(e) => setNotificationTime(e.target.value)}
                      data-testid="settings-notification-time"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
                    <SlidersHorizontal className="h-4 w-4 text-accent" />
                    캘린더 연동
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    캘린더를 연동하면 회고 후 일정을 자동으로 등록할 수 있어요.
                  </div>

                  <div className="mt-4 space-y-3">
                    {calLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 w-full rounded-xl shimmer" />
                        <div className="h-16 w-full rounded-xl shimmer" />
                      </div>
                    ) : (
                      <>
                        <CalendarCard
                          name="Google Calendar"
                          icon={<SiGoogle className="h-4 w-4 text-foreground/80" />}
                          connected={googleConnected}
                          onConnect={handleGoogleConnect}
                          onDisconnect={handleGoogleDisconnect}
                          testIdPrefix="settings-google"
                        />
                        <CalendarCard
                          name="Lark Calendar"
                          icon={<CalendarDays className="h-4 w-4 text-foreground/80" />}
                          connected={larkConnected}
                          onConnect={handleLarkConnect}
                          onDisconnect={handleLarkDisconnect}
                          testIdPrefix="settings-lark"
                          extra={
                            !larkConnected && larkHasCredentials ? (
                              <button
                                type="button"
                                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                onClick={() => setShowLarkSetup(true)}
                                data-testid="settings-lark-edit-credentials"
                              >
                                설정 변경
                              </button>
                            ) : null
                          }
                        />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-foreground/95">스케줄 가능 시간대</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    이 시간대의 빈 시간에 블록을 배치해요.
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">시작 (0~23시)</div>
                      <SoftInput
                        type="number"
                        min={0}
                        max={23}
                        value={start}
                        onChange={(e) => setStart(Number(e.target.value))}
                        data-testid="settings-hours-start"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">종료 (1~24시)</div>
                      <SoftInput
                        type="number"
                        min={1}
                        max={24}
                        value={end}
                        onChange={(e) => setEnd(Number(e.target.value))}
                        data-testid="settings-hours-end"
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-3 rounded-xl border p-3 text-xs",
                      end <= start
                        ? "border-destructive/30 bg-destructive/10 text-destructive-foreground/90"
                        : "border-border/60 bg-muted/20 text-muted-foreground",
                    )}
                    data-testid="settings-hours-hint"
                  >
                    {end <= start
                      ? "종료 시각이 시작 시각보다 뒤여야 해요."
                      : `${start}:00 ~ ${end}:00 사이에서 블록을 배치해요.`}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-foreground/95">언어</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    현재 UI는 한국어 중심이에요.
                  </div>

                  <div className="mt-3 max-w-sm">
                    <Select value={language} onValueChange={(v) => setLanguage(v as "ko" | "en")}>
                      <SelectTrigger
                        className="focus-ring rounded-xl border-2 border-border/70 bg-background/20"
                        data-testid="settings-language"
                      >
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-border/70">
                        <SelectItem value="ko" data-testid="settings-language-ko">한국어</SelectItem>
                        <SelectItem value="en" data-testid="settings-language-en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    저장하면 바로 반영돼요.
                  </div>
                  <button
                    type="button"
                    className="btn-premium focus-ring w-full sm:w-auto"
                    onClick={save}
                    disabled={!canSave}
                    data-testid="settings-save"
                  >
                    {update.isPending ? "저장 중…" : "저장"}
                    <Check className="h-4 w-4" />
                  </button>
                </div>

                {update.error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground/90" data-testid="settings-save-error">
                    {String(update.error)}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="glass-card p-5 sm:p-6 hidden lg:block">
            <div className="text-sm font-semibold text-foreground/95">추천 설정</div>
            <div className="mt-2 text-sm text-muted-foreground">
              처음이라면 아래 가이드를 참고해 보세요.
            </div>

            <div className="mt-5 space-y-3">
              <Tip title="알림 시각" body="저녁 루틴이 끝나는 시간(21:00~23:00 사이)을 추천해요." />
              <Tip title="가능 시간대" body="아침 집중이 필요한 날이면 오전(9~12시)을 넉넉히 열어 두세요." />
              <Tip title="블록 길이" body="처음에는 30~60분 블록 한두 개로 시작하는 게 좋아요." />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showLarkSetup} onOpenChange={setShowLarkSetup}>
        <DialogContent
          className="glass-card border-border/70 sm:max-w-md mobile-bottom-sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
          data-testid="lark-credentials-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground/95">
              <Key className="h-4 w-4 text-primary" />
              Lark 앱 인증 정보
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Lark Developer Console에서 앱을 만든 뒤 App ID와 App Secret을 입력해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="lark-app-id">
                App ID
              </label>
              <SoftInput
                id="lark-app-id"
                placeholder="cli_xxxxxxxxxxxxxxxx"
                value={larkAppIdInput}
                onChange={(e) => setLarkAppIdInput(e.target.value)}
                data-testid="input-lark-app-id"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="lark-app-secret">
                App Secret
              </label>
              <SoftInput
                id="lark-app-secret"
                type="password"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={larkAppSecretInput}
                onChange={(e) => setLarkAppSecretInput(e.target.value)}
                data-testid="input-lark-app-secret"
              />
            </div>

            {data?.larkAppId ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground" data-testid="lark-credentials-saved">
                <span className="font-semibold text-foreground/80">저장된 App ID:</span>{" "}
                {data.larkAppId}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                variant="ghost"
                onClick={() => setShowLarkSetup(false)}
                data-testid="button-lark-cancel"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveLarkCredentials}
                disabled={larkSaveCredentials.isPending}
                data-testid="button-lark-save-credentials"
              >
                {larkSaveCredentials.isPending ? "저장 중…" : "저장 후 연동하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Tip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/10 p-4">
      <div className="text-xs font-semibold text-foreground/90">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}
