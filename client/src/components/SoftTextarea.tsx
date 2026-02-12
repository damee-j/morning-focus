import * as React from "react";
import { cn } from "@/lib/utils";

export const SoftTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function SoftTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring w-full resize-none rounded-2xl border-2 bg-background/20 px-4 py-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground",
        "border-border/70 hover:border-border transition-all duration-200",
        "shadow-[0_18px_60px_rgba(0,0,0,.25)]",
        className,
      )}
      {...props}
    />
  );
});
