"use server";

import { prisma, type Prisma } from "@svadba/db";
import {
  businessProfileSchema,
  DAY_STATUSES,
  extraSchema,
  gallerySchema,
  hallSchema,
  INVITE_LINK_DAYS,
  isLocale,
  menuPackageSchema,
  newBusinessSchema,
  PHOTO_LIMITS,
  servicePackageSchema,
  travelFeeSchema,
  videoLinkSchema,
  type DayStatus,
} from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodType } from "zod";
import { canManageTeam, getBusinessAccess, getChecklist, newToken, uniqueBusinessSlug } from "@/lib/business";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";
import { deleteImage, ImageError, saveImage } from "@/lib/storage";

const refresh = () => revalidatePath("/", "layout");

async function ensureVendorRole(userId: string, roles: string[]) {
  if (!roles.includes("VENDOR")) {
    await prisma.user.update({ where: { id: userId }, data: { roles: { push: "VENDOR" } } });
  }
}

// ─── Create / profile / status ───

export async function createBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const locale = formData.get("locale");
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  const parsed = newBusinessSchema.safeParse({
    category: formData.get("category"),
    name: formData.get("name"),
    cityId: formData.get("cityId"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (!(await prisma.city.findUnique({ where: { id: parsed.data.cityId } }))) {
    return { fieldErrors: { cityId: "required" } };
  }

  const business = await prisma.business.create({
    data: {
      ...parsed.data,
      slug: await uniqueBusinessSlug(parsed.data.name),
      unmarkedDays: parsed.data.category === "VENUE" ? "FREE" : "UNKNOWN",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  await ensureVendorRole(user.id, user.roles);
  redirect(`/${locale}/vendor/${business.id}`);
}

export async function updateBusinessProfileAction(
  businessId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access) return { formError: "forbidden" };
  const fields = Object.keys(businessProfileSchema.shape);
  const parsed = businessProfileSchema.safeParse(Object.fromEntries(fields.map((f) => [f, formData.get(f) ?? ""])));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { business } = access;
  const nameChanged = parsed.data.name !== business.name;
  const data: Prisma.BusinessUpdateInput = {
    ...parsed.data,
    city: { connect: { id: parsed.data.cityId } },
    // Keep the public link stable once a profile is live.
    ...(nameChanged && business.status === "DRAFT" ? { slug: await uniqueBusinessSlug(parsed.data.name, business.id) } : {}),
  };
  delete (data as { cityId?: string }).cityId;

  const ids = (key: string) => formData.getAll(key).filter((v): v is string => typeof v === "string");
  await prisma.$transaction(async (tx) => {
    await tx.business.update({ where: { id: business.id }, data });
    if (business.category === "VENUE") {
      const valid = await tx.venueFeature.findMany({ where: { id: { in: ids("features") } }, select: { id: true } });
      await tx.businessFeature.deleteMany({ where: { businessId: business.id } });
      await tx.businessFeature.createMany({ data: valid.map((f) => ({ businessId: business.id, featureId: f.id })) });
    }
    if (business.category === "BAND") {
      const valid = await tx.musicGenre.findMany({ where: { id: { in: ids("genres") } }, select: { id: true } });
      await tx.businessGenre.deleteMany({ where: { businessId: business.id } });
      await tx.businessGenre.createMany({ data: valid.map((g) => ({ businessId: business.id, genreId: g.id })) });
    }
  });
  refresh();
  return { ok: true };
}

export async function submitForReviewAction(businessId: string): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access) return { formError: "forbidden" };
  const { business } = access;
  if (business.status !== "DRAFT" && business.status !== "REJECTED") return { formError: "generic" };
  const checklist = await getChecklist(business);
  if (checklist.some((i) => !i.done)) return { formError: "incomplete" };
  await prisma.business.update({
    where: { id: business.id },
    data: { status: "PENDING", submittedAt: new Date(), rejectionReason: null },
  });
  refresh();
  return { ok: true };
}

export async function deleteBusinessAction(businessId: string, locale: string): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || !canManageTeam(access.role) || !isLocale(locale)) return { formError: "forbidden" };
  const photos = await prisma.photo.findMany({ where: { businessId }, select: { url: true } });
  await prisma.business.delete({ where: { id: businessId } });
  await Promise.all(photos.map((p) => deleteImage(p.url)));
  refresh();
  redirect(`/${locale}/${access.role === "ADMIN" ? "admin/businesses" : "vendor"}`);
}

// ─── Photos & video ───

export async function uploadPhotosAction(
  businessId: string,
  galleryId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access) return { formError: "forbidden" };
  if (galleryId) {
    const gallery = await prisma.portfolioGallery.findFirst({ where: { id: galleryId, businessId } });
    if (!gallery) return { formError: "forbidden" };
  }
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { fieldErrors: { photos: "required" } };

  const existing = await prisma.photo.count({ where: { businessId } });
  const room = PHOTO_LIMITS[access.business.category] - existing;
  if (room <= 0) return { fieldErrors: { photos: "photoLimit" } };

  const last = await prisma.photo.findFirst({
    where: { businessId, galleryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let sortOrder = (last?.sortOrder ?? -1) + 1;
  let error: FormState["fieldErrors"] | undefined;
  for (const file of files.slice(0, room)) {
    try {
      const url = await saveImage(file, `businesses/${businessId}`);
      await prisma.photo.create({ data: { businessId, galleryId, url, sortOrder: sortOrder++ } });
    } catch (e) {
      if (e instanceof ImageError) error = { photos: e.code };
      else throw e;
    }
  }
  if (files.length > room) error = { photos: "photoLimit" };
  refresh();
  return error ? { fieldErrors: error } : { ok: true };
}

export async function deletePhotoAction(businessId: string, photoId: string): Promise<FormState> {
  if (!(await getBusinessAccess(businessId))) return { formError: "forbidden" };
  const photo = await prisma.photo.findFirst({ where: { id: photoId, businessId } });
  if (!photo) return { formError: "generic" };
  await prisma.photo.delete({ where: { id: photo.id } });
  await deleteImage(photo.url);
  refresh();
  return { ok: true };
}

/** Moves a photo one place left/right, or to the front ("cover"). */
export async function movePhotoAction(
  businessId: string,
  photoId: string,
  move: "left" | "right" | "cover",
): Promise<FormState> {
  if (!(await getBusinessAccess(businessId))) return { formError: "forbidden" };
  const photo = await prisma.photo.findFirst({ where: { id: photoId, businessId } });
  if (!photo) return { formError: "generic" };
  const siblings = await prisma.photo.findMany({
    where: { businessId, galleryId: photo.galleryId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const order = siblings.map((s) => s.id);
  const index = order.indexOf(photo.id);
  order.splice(index, 1);
  const target = move === "cover" ? 0 : Math.max(0, Math.min(order.length, index + (move === "left" ? -1 : 1)));
  order.splice(target, 0, photo.id);
  await prisma.$transaction(order.map((id, i) => prisma.photo.update({ where: { id }, data: { sortOrder: i } })));
  refresh();
  return { ok: true };
}

export async function createGalleryAction(businessId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || access.business.category !== "PHOTO_VIDEO") return { formError: "forbidden" };
  const parsed = gallerySchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const count = await prisma.portfolioGallery.count({ where: { businessId } });
  await prisma.portfolioGallery.create({ data: { businessId, title: parsed.data.title, sortOrder: count } });
  refresh();
  return { ok: true };
}

export async function deleteGalleryAction(businessId: string, galleryId: string): Promise<FormState> {
  if (!(await getBusinessAccess(businessId))) return { formError: "forbidden" };
  const gallery = await prisma.portfolioGallery.findFirst({
    where: { id: galleryId, businessId },
    include: { photos: { select: { url: true } } },
  });
  if (!gallery) return { formError: "generic" };
  await prisma.portfolioGallery.delete({ where: { id: gallery.id } });
  await Promise.all(gallery.photos.map((p) => deleteImage(p.url)));
  refresh();
  return { ok: true };
}

// ─── Halls, menus, extras, packages, travel fees, videos ───

export type ItemKind = "hall" | "menu" | "extra" | "package" | "travel" | "video";

const ITEM_SCHEMAS: Record<ItemKind, ZodType> = {
  hall: hallSchema,
  menu: menuPackageSchema,
  extra: extraSchema,
  package: servicePackageSchema,
  travel: travelFeeSchema,
  video: videoLinkSchema,
};

const ITEM_FIELDS: Record<ItemKind, string[]> = {
  hall: ["name", "capacityMin", "capacityMax", "description"],
  menu: ["nameMk", "nameSq", "nameEn", "pricePerPerson", "currency", "minGuests", "courses", "drinks", "drinksNote"],
  extra: ["nameMk", "nameSq", "nameEn", "price", "currency", "unit"],
  package: ["nameMk", "nameSq", "nameEn", "price", "currency", "hours", "members", "extraHourPrice", "includes"],
  travel: ["cityId", "price", "currency"],
  video: ["url"],
};

/** Which kinds each category may use. */
const ALLOWED: Record<string, ItemKind[]> = {
  VENUE: ["hall", "menu", "extra", "video"],
  BAND: ["package", "travel", "video"],
  PHOTO_VIDEO: ["package", "video"],
};

// Prisma delegates share method names but not types; this narrows them to what we call.
type Delegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
};
function delegate(kind: ItemKind): Delegate {
  const map = {
    hall: prisma.hall,
    menu: prisma.menuPackage,
    extra: prisma.extra,
    package: prisma.servicePackage,
    travel: prisma.travelFee,
    video: prisma.videoLink,
  };
  return map[kind] as unknown as Delegate;
}

export async function saveItemAction(
  kind: ItemKind,
  businessId: string,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || !ALLOWED[access.business.category]?.includes(kind)) return { formError: "forbidden" };
  const raw = Object.fromEntries(ITEM_FIELDS[kind].map((f) => [f, formData.get(f) ?? ""]));
  const parsed = ITEM_SCHEMAS[kind].safeParse(raw);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const data = parsed.data as Record<string, unknown>;

  if (kind === "hall" && typeof data.capacityMin === "number" && data.capacityMin > (data.capacityMax as number)) {
    return { fieldErrors: { capacityMin: "capacityRange" } };
  }
  if (kind === "travel") {
    if (data.cityId === access.business.cityId) return { fieldErrors: { cityId: "homeCity" } };
    if (!(await prisma.city.findUnique({ where: { id: data.cityId as string } }))) return { fieldErrors: { cityId: "required" } };
    const duplicate = await prisma.travelFee.findFirst({
      where: { businessId, cityId: data.cityId as string, ...(id ? { NOT: { id } } : {}) },
    });
    if (duplicate) return { fieldErrors: { cityId: "duplicateCity" } };
  }

  const d = delegate(kind);
  if (id) {
    const { count } = await d.updateMany({ where: { id, businessId }, data });
    if (count === 0) return { formError: "generic" };
  } else {
    const sortOrder = kind === "travel" ? {} : { sortOrder: await d.count({ where: { businessId } }) };
    await d.create({ data: { ...data, ...sortOrder, businessId } });
  }
  refresh();
  return { ok: true };
}

export async function deleteItemAction(kind: ItemKind, businessId: string, id: string): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || !ALLOWED[access.business.category]?.includes(kind)) return { formError: "forbidden" };
  await delegate(kind).deleteMany({ where: { id, businessId } });
  refresh();
  return { ok: true };
}

// ─── Calendar ───

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Sets the status of one or more days; status null clears them. */
export async function setDaysAction(
  businessId: string,
  calendarKey: string,
  dates: string[],
  status: DayStatus | null,
): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access) return { formError: "forbidden" };
  if (!Array.isArray(dates) || dates.length === 0 || dates.length > 62 || !dates.every((d) => DATE_RE.test(d))) {
    return { formError: "generic" };
  }
  if (status !== null && !DAY_STATUSES.includes(status)) return { formError: "generic" };

  let hallId: string | null = null;
  if (calendarKey !== "main") {
    const hall = await prisma.hall.findFirst({ where: { id: calendarKey, businessId } });
    if (!hall) return { formError: "forbidden" };
    hallId = hall.id;
  }
  const days = dates.map((d) => new Date(`${d}T00:00:00Z`));

  if (status === null) {
    await prisma.availabilityDay.deleteMany({ where: { businessId, calendarKey, date: { in: days } } });
  } else {
    await prisma.$transaction(
      days.map((date) =>
        prisma.availabilityDay.upsert({
          where: { businessId_calendarKey_date: { businessId, calendarKey, date } },
          update: { status },
          create: { businessId, calendarKey, hallId, date, status },
        }),
      ),
    );
  }
  revalidatePath(`/[locale]/v/${access.business.slug}`, "page");
  return { ok: true };
}

export async function setUnmarkedDaysAction(businessId: string, value: "FREE" | "UNKNOWN"): Promise<FormState> {
  if (!(await getBusinessAccess(businessId)) || (value !== "FREE" && value !== "UNKNOWN")) return { formError: "forbidden" };
  await prisma.business.update({ where: { id: businessId }, data: { unmarkedDays: value } });
  refresh();
  return { ok: true };
}

// ─── Team ───

export async function createInviteAction(businessId: string): Promise<FormState & { token?: string }> {
  const access = await getBusinessAccess(businessId);
  if (!access || !canManageTeam(access.role)) return { formError: "forbidden" };
  const token = newToken();
  await prisma.businessInvite.create({
    data: { businessId, token, expiresAt: new Date(Date.now() + INVITE_LINK_DAYS * 86_400_000) },
  });
  refresh();
  return { ok: true, token };
}

export async function revokeInviteAction(businessId: string, inviteId: string): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || !canManageTeam(access.role)) return { formError: "forbidden" };
  await prisma.businessInvite.deleteMany({ where: { id: inviteId, businessId } });
  refresh();
  return { ok: true };
}

export async function removeMemberAction(businessId: string, memberId: string): Promise<FormState> {
  const access = await getBusinessAccess(businessId);
  if (!access || !canManageTeam(access.role)) return { formError: "forbidden" };
  // Owners can't be removed here; only staff.
  await prisma.businessMember.deleteMany({ where: { id: memberId, businessId, role: "STAFF" } });
  refresh();
  return { ok: true };
}

/** Accepts an admin's claim link: the signed-in user becomes the owner. */
export async function claimBusinessAction(token: string, locale: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  const business = await prisma.business.findUnique({ where: { claimToken: token } });
  if (!business || !business.claimExpiresAt || business.claimExpiresAt < new Date()) return { formError: "invalidLink" };
  await prisma.$transaction([
    prisma.businessMember.deleteMany({ where: { businessId: business.id, role: "OWNER" } }),
    prisma.businessMember.upsert({
      where: { businessId_userId: { businessId: business.id, userId: user.id } },
      update: { role: "OWNER" },
      create: { businessId: business.id, userId: user.id, role: "OWNER" },
    }),
    prisma.business.update({ where: { id: business.id }, data: { claimToken: null, claimExpiresAt: null } }),
  ]);
  await ensureVendorRole(user.id, user.roles);
  refresh();
  redirect(`/${locale}/vendor/${business.id}`);
}

/** Accepts a staff invite link. */
export async function joinBusinessAction(token: string, locale: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  const invite = await prisma.businessInvite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date()) return { formError: "invalidLink" };
  const existing = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId: invite.businessId, userId: user.id } },
  });
  await prisma.$transaction([
    ...(existing ? [] : [prisma.businessMember.create({ data: { businessId: invite.businessId, userId: user.id, role: "STAFF" } })]),
    prisma.businessInvite.delete({ where: { id: invite.id } }),
  ]);
  await ensureVendorRole(user.id, user.roles);
  refresh();
  redirect(`/${locale}/vendor/${invite.businessId}`);
}
