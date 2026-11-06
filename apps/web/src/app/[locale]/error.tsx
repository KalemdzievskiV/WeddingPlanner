"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => reportError(error), [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("text")}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <ButtonLink href="/" variant="secondary">
          {t("home")}
        </ButtonLink>
      </div>
      {error.digest && <p className="mt-6 text-xs tabular-nums text-stone">{t("code", { code: error.digest })}</p>}
    </main>
  );
}
