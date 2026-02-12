import { cn } from "@/lib/utils";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  right,
  testId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            data-testid={testId ? `${testId}-eyebrow` : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/90" />
            {eyebrow}
          </div>
        )}
        <h1
          className={cn(
            "mt-3 text-3xl leading-[1.05] sm:text-4xl",
            "headline-shine",
          )}
          data-testid={testId ? `${testId}-title` : undefined}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
            data-testid={testId ? `${testId}-desc` : undefined}
          >
            {description}
          </p>
        )}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
