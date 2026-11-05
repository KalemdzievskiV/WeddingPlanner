import type { ReactNode } from "react";

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-stone">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
