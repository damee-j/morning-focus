import { cn } from "@/lib/utils";

export default function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "amber",
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "amber" | "cyan" | "violet" | "green";
  testId?: string;
}) {
  const toneMap = {
    amber: "from-primary/18 via-primary/6 to-transparent border-primary/20",
    cyan: "from-accent/18 via-accent/6 to-transparent border-accent/20",
    violet: "from-violet-400/16 via-violet-400/6 to-transparent border-violet-400/20",
    green: "from-emerald-400/16 via-emerald-400/6 to-transparent border-emerald-400/20",
  }[tone];

  return (
    <div
      className={cn(
        "glass-card group relative overflow-hidden p-5",
        "transition-all duration-300",
      )}
      data-testid={testId}
    >
      <div className={cn("absolute -inset-8 bg-gradient-to-br blur-2xl", toneMap)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground/95">{value}</div>
          {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border/70 bg-background/20">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="relative mt-4 h-px w-full bg-gradient-to-r from-border/0 via-border/70 to-border/0" />
      <div className="relative mt-4 text-xs text-muted-foreground">
        작은 변화가 내일의 흐름을 바꿔요.
      </div>
    </div>
  );
}
