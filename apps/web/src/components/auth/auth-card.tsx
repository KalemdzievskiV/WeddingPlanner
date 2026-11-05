import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Stitch } from "@/components/ui/stitch";

export function AuthCard({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <Stitch className="mx-6 mt-6 w-16" />
      <div className="px-6 pb-7 pt-5 sm:px-8">
        <h1 className="font-display text-[1.9rem] leading-tight">{title}</h1>
        {lead && <p className="mt-2 text-stone">{lead}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </Card>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-stone">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
