import { cn } from "@/lib/utils";

/** The cross-stitch band. Decorative only. */
export function Stitch({ className, light }: { className?: string; light?: boolean }) {
  return <div aria-hidden className={cn("stitch", light && "stitch-light", className)} />;
}
