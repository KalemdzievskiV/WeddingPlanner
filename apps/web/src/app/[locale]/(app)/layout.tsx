import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        {children}
      </main>
    </>
  );
}
