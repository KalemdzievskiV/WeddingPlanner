import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Tone = "info" | "success" | "error";
const tones: Record<Tone, string> = {
  info: "border-line-strong bg-surface text-ink-soft",
  success: "border-olive/25 bg-olive-soft text-olive",
  error: "border-danger/25 bg-danger-soft text-danger",
};

export function Alert({ tone = "info", className, ...props }: ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
      {...props}
    />
  );
}
