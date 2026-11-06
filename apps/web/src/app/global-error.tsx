"use client";

import { messages } from "@svadba/i18n";
import { isLocale } from "@svadba/shared";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Last-resort error page when the root layout itself fails, so it can't use the app's providers or styles. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => reportError(error), [error]);
  const first = typeof window === "undefined" ? "" : window.location.pathname.split("/")[1];
  const locale = isLocale(first) ? first : "mk";
  const t = messages[locale].errorPage;

  return (
    <html lang={locale}>
      <body style={{ margin: 0, background: "#FAF8F5", color: "#231A1D", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 32 }}>{t.title}</h1>
          <p style={{ color: "#5C5050" }}>{t.text}</p>
          <a href={`/${locale}`} style={{ color: "#7A1F33" }}>
            {t.home}
          </a>
        </main>
      </body>
    </html>
  );
}
