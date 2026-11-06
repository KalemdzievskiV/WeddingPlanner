import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

/** Signed-in and sign-in pages stay out of search engines (decision 95). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
