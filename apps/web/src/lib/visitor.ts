import "server-only";
import { prisma } from "@svadba/db";
import type { FavoriteState } from "@/components/search/favorite-button";
import { getCurrentUser } from "./session";
import { canEdit, getWeddingAccess } from "./wedding";

/** What the current visitor can do with favourites, and which vendors their wedding saved. */
export async function favoriteContext() {
  const [user, access] = await Promise.all([getCurrentUser(), getWeddingAccess()]);
  const state: FavoriteState = !user ? "signIn" : !access ? "noWedding" : !canEdit(access.role) ? "viewer" : "ready";
  const favorites = access
    ? new Set((await prisma.favorite.findMany({ where: { weddingId: access.wedding.id }, select: { businessId: true } })).map((f) => f.businessId))
    : new Set<string>();
  return { state, favorites, access };
}
