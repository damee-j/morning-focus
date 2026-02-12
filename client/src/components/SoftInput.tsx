import * as React from "react";
import { cn } from "@/lib/utils";

export const SoftInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function SoftInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "focus-ring w-full rounded-xl border-2 bg-background/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
          "border-border/70 hover:border-border transition-all duration-200",
          "shadow-[0_18px_60px_rgba(0,0,0,.25)]",
          className,
        )}
        {...props}
      />
    );
  },
);
