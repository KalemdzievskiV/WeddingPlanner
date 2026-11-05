import { cn } from "@/lib/utils";

/** Wordmark: the app name in Prata with a single stitch mark. */
export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl text-ink", className)}>
      <svg aria-hidden width="14" height="14" viewBox="0 0 10 10" className="text-vranec">
        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {name}
    </span>
  );
}
