import "server-only";
import { prisma, type Wedding, type WeddingRole } from "@svadba/db";
import { FREE_GUEST_LIMIT, type Locale } from "@svadba/shared";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, type CurrentUser } from "./session";

export type WeddingAccess = {
  user: CurrentUser;
  wedding: Wedding;
  /** Effective role: VIEWER for everyone once the wedding is archived. */
  role: WeddingRole;
  /** The member's own role, regardless of archiving. */
  memberRole: WeddingRole;
  archived: boolean;
  memberId: string;
};

/**
 * The signed-in user's wedding (one per account), or null. Cached per request.
 * An archived wedding (decision 90) is read-only, so its effective role is VIEWER.
 */
export const getWeddingAccess = cache(async (): Promise<WeddingAccess | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const member = await prisma.weddingMember.findUnique({ where: { userId: user.id }, include: { wedding: true } });
  if (!member) return null;
  const archived = member.wedding.archivedAt !== null;
  return {
    user,
    wedding: member.wedding,
    role: archived ? "VIEWER" : member.role,
    memberRole: member.role,
    archived,
    memberId: member.id,
  };
});

/** For pages: signed in and has a wedding, otherwise redirect to sign-in or the setup page. */
export async function requireWedding(locale: Locale): Promise<WeddingAccess> {
  const access = await getWeddingAccess();
  if (access) return access;
  const user = await getCurrentUser();
  return redirect({ href: user ? "/plan/new" : "/sign-in", locale });
}

export const canEdit = (role: WeddingRole) => role !== "VIEWER";
export const canManage = (role: WeddingRole) => role === "OWNER" || role === "PARTNER";

/** For Server Actions: the wedding if the user may edit it. */
export async function editableWedding(): Promise<WeddingAccess | null> {
  const access = await getWeddingAccess();
  return access && canEdit(access.role) ? access : null;
}

/** For review actions: reviews stay open after the wedding is archived (decision 90). */
export async function reviewingWedding(): Promise<WeddingAccess | null> {
  const access = await getWeddingAccess();
  return access && canEdit(access.memberRole) ? access : null;
}

/** Paid limits apply only when PAYWALL_ENABLED=true (decision 22a). */
export function paywallOn() {
  return process.env.PAYWALL_ENABLED === "true";
}

export function guestLimitReached(wedding: Wedding, currentCount: number, adding: number) {
  return paywallOn() && !wedding.premium && currentCount + adding > FREE_GUEST_LIMIT;
}

export function premiumLocked(wedding: Wedding) {
  return paywallOn() && !wedding.premium;
}
