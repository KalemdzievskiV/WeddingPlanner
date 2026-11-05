import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only 1–5 stars. */
export function Stars({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-4", i <= Math.round(value) ? "fill-amber text-amber" : "fill-transparent text-line-strong")}
        />
      ))}
    </span>
  );
}
