"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction, setEmailNotificationsAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NotificationRow = { id: string; text: string; excerpt: string | null; link: string; when: string; unread: boolean };

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [pending, start] = useTransition();
  const anyUnread = items.some((i) => i.unread);

  return (
    <div className="space-y-4">
      {anyUnread && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await markAllNotificationsReadAction()))}>
            {t("markAll")}
          </Button>
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  if (n.unread) await markNotificationReadAction(n.id);
                  router.push(n.link);
                })
              }
              className={cn("flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-linen/60", n.unread && "bg-rosehip/40")}
            >
              <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", n.unread ? "bg-vranec" : "bg-transparent")} />
              <span className="min-w-0 flex-1">
                <span className={cn("block", n.unread && "font-medium")}>
                  {n.text}
                  {n.unread && <span className="sr-only"> ({t("unread")})</span>}
                </span>
                {n.excerpt && <span className="mt-1 block truncate text-sm text-stone">“{n.excerpt}”</span>}
              </span>
              <span className="shrink-0 text-xs text-stone tabular-nums">{n.when}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmailToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("notifications");
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        defaultChecked={enabled}
        disabled={pending}
        onChange={(e) => {
          const on = e.target.checked;
          start(async () => void (await setEmailNotificationsAction(on)));
        }}
        className="mt-1 size-4 rounded border-line-strong accent-vranec"
      />
      <span>
        <span className="block font-medium">{t("emailToggle")}</span>
        <span className="block text-sm text-stone">{t("emailHint")}</span>
      </span>
    </label>
  );
}
