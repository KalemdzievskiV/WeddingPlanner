import "server-only";
import { prisma } from "@svadba/db";
import type { Locale } from "@svadba/shared";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { auth } from "./auth";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** The signed-in user with app roles, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, roles: true, locale: true, emailVerified: true, createdAt: true },
  });
});

export async function requireUser(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/sign-in", locale });
  return user;
}

export async function requireAdmin(locale: Locale) {
  const user = await requireUser(locale);
  if (!user.roles.includes("ADMIN")) return redirect({ href: "/app", locale });
  return user;
}
