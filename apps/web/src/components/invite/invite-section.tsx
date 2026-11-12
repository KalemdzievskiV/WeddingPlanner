import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Flourish } from "./ornaments";

/** One part of the designed invitation: a script title with a flourish, then its content. */
export function InviteSection({ title, id, className, children }: { title?: string; id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-4 px-5 py-14", className)}>
      {title && (
        <header className="mb-8 text-center">
          <h2 className="inv-script text-5xl leading-tight text-[var(--inv-accent)]">{title}</h2>
          <Flourish className="mx-auto mt-2 w-40" />
        </header>
      )}
      <div className="mx-auto max-w-md">{children}</div>
    </section>
  );
}
