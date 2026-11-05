"use server";

import { Prisma, prisma } from "@svadba/db";
import { citySchema, vendorCategorySchema, venueFeatureSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";

export type ReferenceKind = "city" | "feature" | "category" | "genre";
const KINDS: ReferenceKind[] = ["city", "feature", "category", "genre"];

async function getAdmin() {
  const user = await getCurrentUser();
  return user?.roles.includes("ADMIN") ? user : null;
}

function readTranslated(formData: FormData) {
  return {
    slug: formData.get("slug"),
    nameMk: formData.get("nameMk"),
    nameSq: formData.get("nameSq"),
    nameEn: formData.get("nameEn"),
    region: formData.get("region") ?? "",
    active: formData.get("active") === "on",
  };
}

/** Creates (id = null) or updates a city, venue feature or vendor category. */
export async function saveReferenceAction(
  kind: ReferenceKind,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await getAdmin()) || !KINDS.includes(kind)) return { formError: "forbidden" };
  const raw = readTranslated(formData);

  try {
    if (kind === "city") {
      const parsed = citySchema.safeParse(raw);
      if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
      const data = { ...parsed.data, region: parsed.data.region || null };
      if (id) await prisma.city.update({ where: { id }, data });
      else await prisma.city.create({ data: { ...data, sortOrder: await prisma.city.count() } });
    } else if (kind === "feature") {
      const parsed = venueFeatureSchema.safeParse(raw);
      if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
      if (id) await prisma.venueFeature.update({ where: { id }, data: parsed.data });
      else await prisma.venueFeature.create({ data: { ...parsed.data, sortOrder: await prisma.venueFeature.count() } });
    } else if (kind === "genre") {
      // Same shape as venue features: slug + three names + visible.
      const parsed = venueFeatureSchema.safeParse(raw);
      if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
      if (id) await prisma.musicGenre.update({ where: { id }, data: parsed.data });
      else await prisma.musicGenre.create({ data: { ...parsed.data, sortOrder: await prisma.musicGenre.count() } });
    } else {
      // Categories are fixed: rename or hide only.
      const parsed = vendorCategorySchema.safeParse(raw);
      if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
      if (!id) return { formError: "forbidden" };
      await prisma.vendorCategory.update({ where: { id }, data: parsed.data });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { slug: "slugTaken" } };
    }
    console.error("[saveReference]", error);
    return { formError: "generic" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteReferenceAction(kind: ReferenceKind, id: string): Promise<FormState> {
  if (!(await getAdmin())) return { formError: "forbidden" };
  if (kind === "city") await prisma.city.delete({ where: { id } });
  else if (kind === "feature") await prisma.venueFeature.delete({ where: { id } });
  else if (kind === "genre") await prisma.musicGenre.delete({ where: { id } });
  else return { formError: "forbidden" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAdminRoleAction(userId: string, makeAdmin: boolean): Promise<FormState> {
  const admin = await getAdmin();
  if (!admin || admin.id === userId) return { formError: "forbidden" };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
  if (!target) return { formError: "generic" };
  const roles = makeAdmin
    ? Array.from(new Set([...target.roles, "ADMIN" as const]))
    : target.roles.filter((r) => r !== "ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { roles } });
  revalidatePath("/", "layout");
  return { ok: true };
}
