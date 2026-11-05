"use server";

import { prisma } from "@svadba/db";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";

export async function markNotificationReadAction(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || typeof id !== "string") return { formError: "forbidden" };
  await prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "forbidden" };
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Account setting: email copies of notifications (decision 82). */
export async function setEmailNotificationsAction(enabled: boolean): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "forbidden" };
  await prisma.user.update({ where: { id: user.id }, data: { emailNotifications: !!enabled } });
  revalidatePath("/", "layout");
  return { ok: true };
}
