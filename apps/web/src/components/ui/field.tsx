import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 h-10 text-[15px] text-ink placeholder:text-stone/70 transition-colors hover:border-ink-soft/50 focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15 aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-medium text-ink", className)} {...props} />;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-4 rounded border-line-strong accent-vranec", className)}
      {...props}
    />
  );
}
