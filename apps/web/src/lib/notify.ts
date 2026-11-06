import "server-only";
import { prisma, type NotificationType } from "@svadba/db";
import { messages } from "@svadba/i18n";
import { isLocale, type Locale } from "@svadba/shared";
import { createTranslator } from "next-intl";
import { sendNotificationEmail } from "./email";
import { env } from "./env";

/** Values shown in notification text. */
export type NotificationData = { business?: string; couple?: string; from?: string; rating?: number; excerpt?: string };

const recipientSelect = { id: true, name: true, email: true, locale: true, emailNotifications: true, deletionRequestedAt: true } as const;
type Recipient = { id: string; name: string; email: string; locale: string; emailNotifications: boolean; deletionRequestedAt?: Date | null };

/** Owner and staff of a business (decision 82), except the person who acted. */
export async function businessTeam(businessId: string, exceptUserId?: string) {
  const members = await prisma.businessMember.findMany({ where: { businessId }, select: { user: { select: recipientSelect } } });
  return members.map((m) => m.user).filter((u) => u.id !== exceptUserId);
}

/** Wedding members who plan (not view-only), except the person who acted. */
export async function weddingTeam(weddingId: string, exceptUserId?: string) {
  const members = await prisma.weddingMember.findMany({
    where: { weddingId, role: { not: "VIEWER" } },
    select: { user: { select: recipientSelect } },
  });
  return members.map((m) => m.user).filter((u) => u.id !== exceptUserId);
}

export async function admins() {
  return prisma.user.findMany({ where: { roles: { has: "ADMIN" } }, select: recipientSelect });
}

/** Text of a notification in the reader's language. */
export function notificationText(locale: Locale, type: NotificationType, data: NotificationData) {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "notifications.types" });
  return t(type, { business: data.business ?? "", couple: data.couple ?? "", from: data.from ?? "", rating: data.rating ?? 0 });
}

/**
 * Bell notification for each recipient, plus an email for those who keep emails on.
 * `link` is an app path without the locale, e.g. "/plan/inquiries/abc".
 */
export async function notify(all: Recipient[], type: NotificationType, data: NotificationData, link: string) {
  // Accounts waiting to be deleted (decision 89) get nothing.
  const recipients = all.filter((r) => !r.deletionRequestedAt);
  if (recipients.length === 0) return;
  await prisma.notification.createMany({ data: recipients.map((r) => ({ userId: r.id, type, data, link })) });
  await Promise.all(
    recipients
      .filter((r) => r.emailNotifications)
      .map(async (r) => {
        const locale: Locale = isLocale(r.locale) ? r.locale : "mk";
        const subject = notificationText(locale, type, data);
        try {
          await sendNotificationEmail({
            to: r.email,
            name: r.name,
            locale,
            subject,
            text: data.excerpt ? `${subject}\n\n“${data.excerpt}”` : subject,
            url: `${env.appUrl}/${locale}${link}`,
          });
        } catch (error) {
          console.error("[notify] email failed", error);
        }
      }),
  );
}

/** Short preview of a message for emails. */
export function excerpt(text: string, max = 280) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
