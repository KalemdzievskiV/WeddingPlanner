import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Tone = "neutral" | "accent" | "success" | "warning";
const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  accent: "bg-rosehip text-vranec-deep",
  success: "bg-olive-soft text-olive",
  warning: "bg-amber-soft text-amber",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
