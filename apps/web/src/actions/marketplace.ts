"use server";

import { prisma } from "@svadba/db";
import { cookies, headers } from "next/headers";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";
import { bumpStat, recordView } from "@/lib/stats";
import { editableWedding } from "@/lib/wedding";

/** Saves or removes a vendor in the wedding's favourites (decision 76). */
export async function toggleFavoriteAction(businessId: string): Promise<FormState & { favorite?: boolean }> {
  const access = await editableWedding();
  if (!access || typeof businessId !== "string") return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const key = { weddingId_businessId: { weddingId, businessId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
    revalidatePath("/", "layout");
    return { ok: true, favorite: false };
  }
  const business = await prisma.business.findFirst({ where: { id: businessId, status: "APPROVED" }, select: { id: true } });
  if (!business) return { formError: "generic" };
  await prisma.favorite.create({ data: { weddingId, businessId } });
  await bumpStat(businessId, "favorites");
  revalidatePath("/", "layout");
  return { ok: true, favorite: true };
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget/i;
const VISITOR_COOKIE = "svid";

/**
 * Counts a profile view (decision 84): once per visitor per day, never for bots or the vendor's own team.
 * Called from the browser after the page loads, so prefetches and crawlers without JS don't count.
 */
export async function recordViewAction(businessId: string) {
  if (typeof businessId !== "string") return;
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return;

  const user = await getCurrentUser();
  if (user) {
    const member = await prisma.businessMember.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
    if (member) return;
  }
  const business = await prisma.business.findFirst({ where: { id: businessId, status: "APPROVED" }, select: { id: true } });
  if (!business) return;

  const jar = await cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor || !/^[\w-]{20,64}$/.test(visitor)) {
    visitor = randomUUID();
    jar.set(VISITOR_COOKIE, visitor, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  // Signed-in people count once across devices.
  const id = user ? `u:${user.id}` : `v:${visitor}`;
  await recordView(businessId, createHash("sha256").update(id).digest("hex").slice(0, 32));
}
