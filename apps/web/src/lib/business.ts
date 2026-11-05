import "server-only";
import { prisma, type Business, type MemberRole } from "@svadba/db";
import { MIN_PHOTOS_FOR_APPROVAL, slugify } from "@svadba/shared";
import { randomBytes } from "node:crypto";
import { getCurrentUser, type CurrentUser } from "./session";

export type BusinessAccess = { user: CurrentUser; business: Business; role: MemberRole | "ADMIN" };

/**
 * The signed-in user's access to a business: OWNER, STAFF, or ADMIN (admins can edit any listing).
 * Returns null when the user has no access. Server Actions must call this themselves.
 */
export async function getBusinessAccess(businessId: string): Promise<BusinessAccess | null> {
  const user = await getCurrentUser();
  if (!user || typeof businessId !== "string") return null;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { members: { where: { userId: user.id }, select: { role: true } } },
  });
  if (!business) return null;
  const { members, ...rest } = business;
  const membership = members[0];
  if (membership) return { user, business: rest, role: membership.role };
  if (user.roles.includes("ADMIN")) return { user, business: rest, role: "ADMIN" };
  return null;
}

export function canManageTeam(role: BusinessAccess["role"]) {
  return role === "OWNER" || role === "ADMIN";
}

export async function uniqueBusinessSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "business";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function newToken() {
  return randomBytes(24).toString("base64url");
}

export type ChecklistItem = {
  key: "name" | "address" | "phone" | "description" | "photos" | "priceVenue" | "pricePackage";
  done: boolean;
  tab: "profile" | "photos" | "prices";
};

/** What's still missing before a business can be sent for approval (decision 46). */
export async function getChecklist(business: Business): Promise<ChecklistItem[]> {
  const [photos, halls, menus, packages] = await Promise.all([
    prisma.photo.count({ where: { businessId: business.id } }),
    prisma.hall.count({ where: { businessId: business.id } }),
    prisma.menuPackage.count({ where: { businessId: business.id } }),
    prisma.servicePackage.count({ where: { businessId: business.id } }),
  ]);
  const items: ChecklistItem[] = [
    { key: "name", done: !!business.name && !!business.cityId, tab: "profile" },
    { key: "address", done: !!business.address, tab: "profile" },
    { key: "phone", done: !!business.phone, tab: "profile" },
    { key: "description", done: business.descriptionMk.trim().length >= 40, tab: "profile" },
    { key: "photos", done: photos >= MIN_PHOTOS_FOR_APPROVAL, tab: "photos" },
  ];
  if (business.category === "VENUE") items.push({ key: "priceVenue", done: halls > 0 && menus > 0, tab: "prices" });
  else items.push({ key: "pricePackage", done: packages > 0, tab: "prices" });
  return items;
}

/** Can the current user see a business page that isn't public yet? */
export async function canPreview(businessId: string) {
  return (await getBusinessAccess(businessId)) !== null;
}
