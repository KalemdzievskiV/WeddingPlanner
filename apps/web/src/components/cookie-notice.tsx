"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const KEY = "svadba.cookieNotice";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function dismiss() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((l) => l());
}

/**
 * One-time info notice (decision 88). Only sign-in and language cookies exist, so there's nothing to accept
 * or decline: OK just hides it. Hidden on the server so server and browser HTML match.
 */
export function CookieNotice() {
  const t = useTranslations("legal.cookieNotice");
  // The server snapshot says "dismissed", so nothing renders until the browser checks storage.
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  if (hidden) return null;

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm shadow-[var(--shadow-card)] sm:flex-row sm:items-center print:hidden"
    >
      <p className="flex-1 text-ink-soft">
        {t("text")}{" "}
        <Link href="/privacy#cookies" className="font-medium text-vranec underline-offset-4 hover:underline">
          {t("more")}
        </Link>
      </p>
      <Button size="sm" onClick={dismiss} className="shrink-0">
        {t("ok")}
      </Button>
    </div>
  );
}
