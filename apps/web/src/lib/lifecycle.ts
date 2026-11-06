import "server-only";
import { prisma } from "@svadba/db";
import { isLocale } from "@svadba/shared";
import { todayIso } from "./dates";
import { sendAuthEmail } from "./email";
import { env } from "./env";
import { formatDate } from "./format";
import { coupleNames } from "./plan-helpers";
import { syncRating } from "./reviews";
import { deleteImage } from "./storage";

/** Decision 90: weddings turn read-only this many months after the date. */
export const ARCHIVE_AFTER_MONTHS = 6;
/** Decision 92: guest data is erased this many months after the date… */
export const ERASE_AFTER_MONTHS = 24;
/** …and the owners are warned this many days before. */
export const ERASE_WARNING_DAYS = 30;
/** Decision 89: a deleted account can be restored by signing in within this many days. */
export const DELETE_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight of an ISO day, shifted by whole months and days (wedding dates are stored as UTC dates). */
function shiftIso(iso: string, months: number, days = 0) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return new Date(target.getTime() + days * DAY_MS);
}

export function deletionDate(requestedAt: Date) {
  return new Date(requestedAt.getTime() + DELETE_GRACE_DAYS * DAY_MS);
}

/** Weddings whose date is 6+ months ago become read-only. */
export async function archiveWeddings(today = todayIso()) {
  const { count } = await prisma.wedding.updateMany({
    where: { archivedAt: null, date: { lte: shiftIso(today, -ARCHIVE_AFTER_MONTHS) } },
    data: { archivedAt: new Date() },
  });
  return count;
}

/** Emails owner and partner a month before their guest list is erased. */
export async function warnGuestDataErasure(today = todayIso()) {
  const weddings = await prisma.wedding.findMany({
    where: {
      erasureWarnedAt: null,
      guestDataErasedAt: null,
      date: { lte: shiftIso(today, -ERASE_AFTER_MONTHS, ERASE_WARNING_DAYS) },
      households: { some: {} },
    },
    include: {
      members: {
        where: { role: { in: ["OWNER", "PARTNER"] }, user: { deletionRequestedAt: null } },
        include: { user: { select: { email: true, name: true, locale: true } } },
      },
    },
  });
  for (const w of weddings) {
    const eraseOn = shiftIso(w.date!.toISOString().slice(0, 10), ERASE_AFTER_MONTHS);
    for (const m of w.members) {
      const locale = isLocale(m.user.locale) ? m.user.locale : "mk";
      try {
        await sendAuthEmail({
          to: m.user.email,
          name: m.user.name,
          locale,
          kind: "erasure",
          url: `${env.appUrl}/${locale}/account`,
          date: formatDate(eraseOn),
          couple: coupleNames(w),
        });
      } catch (error) {
        console.error("[lifecycle] erasure warning failed", w.id, error);
      }
    }
    await prisma.wedding.update({ where: { id: w.id }, data: { erasureWarnedAt: new Date() } });
  }
  return weddings.length;
}

/**
 * Erases households, guests, answers and seating 2 years after the date.
 * Only after the warning has had its full month, so a late first run never surprises anyone.
 */
export async function eraseGuestData(today = todayIso(), now = new Date()) {
  const weddings = await prisma.wedding.findMany({
    where: {
      guestDataErasedAt: null,
      date: { lte: shiftIso(today, -ERASE_AFTER_MONTHS) },
      erasureWarnedAt: { lte: new Date(now.getTime() - ERASE_WARNING_DAYS * DAY_MS) },
    },
    select: { id: true },
  });
  for (const { id } of weddings) {
    await prisma.$transaction([
      prisma.seatingTable.deleteMany({ where: { weddingId: id } }),
      // Cascades to guests, their event answers and seats.
      prisma.household.deleteMany({ where: { weddingId: id } }),
      prisma.wedding.update({ where: { id }, data: { guestDataErasedAt: now } }),
    ]);
  }
  return weddings.length;
}

/** Accounts whose 30-day grace has run out. */
export async function eraseDeletedAccounts(now = new Date()) {
  const users = await prisma.user.findMany({
    where: { deletionRequestedAt: { lte: new Date(now.getTime() - DELETE_GRACE_DAYS * DAY_MS) } },
    select: { id: true },
  });
  for (const { id } of users) {
    try {
      await eraseUser(id);
    } catch (error) {
      console.error("[lifecycle] erase user failed", id, error);
    }
  }
  return users.length;
}

/**
 * Erases one account (decision 89):
 * - wedding: an owner's plan passes to the partner, else the first editor; with neither it is erased.
 * - businesses: a sole owner's business passes to the first staff member, else it is hidden for the admin to re-assign.
 */
export async function eraseUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { weddingMember: true, memberships: { where: { role: "OWNER" } } },
  });
  if (!user) return;
  const ratingsToSync = new Set<string>();

  const member = user.weddingMember;
  if (member?.role === "OWNER") {
    const others = await prisma.weddingMember.findMany({
      where: { weddingId: member.weddingId, userId: { not: userId } },
      orderBy: { createdAt: "asc" },
    });
    const successor = others.find((o) => o.role === "PARTNER") ?? others.find((o) => o.role === "EDITOR");
    if (successor) {
      await prisma.weddingMember.update({ where: { id: successor.id }, data: { role: "OWNER" } });
    } else {
      const reviews = await prisma.review.findMany({ where: { weddingId: member.weddingId }, select: { businessId: true } });
      reviews.forEach((r) => ratingsToSync.add(r.businessId));
      await prisma.wedding.delete({ where: { id: member.weddingId } });
    }
  }

  for (const own of user.memberships) {
    const others = await prisma.businessMember.findMany({
      where: { businessId: own.businessId, userId: { not: userId } },
      orderBy: { createdAt: "asc" },
    });
    if (others.some((o) => o.role === "OWNER")) continue;
    const staff = others[0];
    if (staff) {
      await prisma.businessMember.update({ where: { id: staff.id }, data: { role: "OWNER" } });
    } else {
      await prisma.business.update({
        where: { id: own.businessId },
        data: { status: "HIDDEN", rejectionReason: null },
      });
    }
  }

  // Sessions, logins, memberships and notifications cascade; messages and reviews keep the text without the author.
  await prisma.user.delete({ where: { id: userId } });
  if (user.image) await deleteImage(user.image);
  for (const businessId of ratingsToSync) await syncRating(businessId);
}

/** Everything the nightly cron runs, in order. */
export async function runNightly() {
  const started = Date.now();
  const result = {
    archived: await archiveWeddings(),
    erasureWarned: await warnGuestDataErasure(),
    guestDataErased: await eraseGuestData(),
    accountsErased: await eraseDeletedAccounts(),
    ms: 0,
  };
  result.ms = Date.now() - started;
  return result;
}
