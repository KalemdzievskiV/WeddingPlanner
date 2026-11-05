import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotificationList } from "@/components/notifications/list";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { notificationText, type NotificationData } from "@/lib/notify";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("notifications"))("title"), robots: { index: false } };
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const user = await requireUser(locale);
  const t = await getTranslations("notifications");
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <div className="mt-8">
        {items.length === 0 ? (
          <Card className="p-10 text-center text-ink-soft">{t("empty")}</Card>
        ) : (
          <NotificationList
            items={items.map((n) => {
              const data = (n.data ?? {}) as NotificationData;
              return {
                id: n.id,
                text: notificationText(locale, n.type, data),
                excerpt: data.excerpt ?? null,
                link: n.link,
                when: formatDateTime(n.createdAt),
                unread: !n.readAt,
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
