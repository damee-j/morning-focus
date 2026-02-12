import { Link, useLocation } from "wouter";
import {
  History,
  Moon,
  Settings,
  Sparkles,
  Stars,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarStatus } from "@/hooks/use-calendar";

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative grid h-10 w-10 place-items-center rounded-2xl border border-border/70 bg-muted/30 shadow-[0_30px_90px_rgba(0,0,0,.35)]"
        aria-hidden="true"
      >
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-primary/35 via-accent/20 to-transparent blur-md" />
        <Moon className="relative h-5 w-5 text-primary" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground/95" style={{ fontFamily: "var(--font-display)" }}>
          Morning Focus
        </div>
        <div className="text-xs text-muted-foreground">밤에 정리하고, 아침을 가볍게</div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  testId,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId: string;
}) {
  const [loc] = useLocation();
  const active = loc === href;

  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
        active
          ? "bg-primary/12 text-foreground ring-1 ring-primary/25"
          : "text-muted-foreground hover:bg-muted/45 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 transition-transform duration-200", !active && "group-hover:-translate-y-0.5")} />
      <span>{label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(251,191,36,.10)]" />
      )}
    </Link>
  );
}

export default function Shell({
  children,
  headerRight,
}: {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const { data: calStatus } = useCalendarStatus();

  return (
    <div className="night-surface grain-overlay min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Brand />
            <div className="md:hidden">{headerRight}</div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div
              className="glass-card flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
              data-testid="calendar-status-pill"
            >
              <Stars className="h-4 w-4 text-accent/90" />
              <span className="font-semibold text-foreground/80">
                캘린더
              </span>
              <span className="mx-1 h-1 w-1 rounded-full bg-border" />
              <span className={cn(calStatus?.connected ? "text-foreground/90" : "text-muted-foreground")}>
                {calStatus?.connected ? "연결됨" : "미연결"}
              </span>
              <span className="mx-1 h-1 w-1 rounded-full bg-border" />
              <span className="text-muted-foreground">
                {calStatus?.provider === "google" ? "Google" : "Lark"}
              </span>
            </div>
            {headerRight}
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="glass-card h-fit p-3 lg:sticky lg:top-6">
            <div className="px-3 pb-2 pt-2 text-xs font-semibold text-muted-foreground">
              NAV
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/" icon={Sparkles} label="홈" testId="nav-home" />
              <NavLink href="/reflect" icon={Wand2} label="저녁 회고" testId="nav-reflect" />
              <NavLink href="/history" icon={History} label="기록" testId="nav-history" />
              <NavLink href="/settings" icon={Settings} label="설정" testId="nav-settings" />
            </nav>

          </aside>

          <main className="min-w-0">{children}</main>
        </div>

        <footer className="mt-10 pb-4 text-center text-xs text-muted-foreground">
          <span className="opacity-80">calm nighttime companion · Morning Focus</span>
        </footer>
      </div>
    </div>
  );
}
