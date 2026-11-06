"use server";

import { prisma } from "@svadba/db";
import { isLocale, profileSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { sendAuthEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { deletionDate } from "@/lib/lifecycle";
import { getCurrentUser } from "@/lib/session";
import { ImageError, saveImage } from "@/lib/storage";

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { locale?: string }> {
  const user = await getCurrentUser();
  if (!user) return { formError: "forbidden" };
  const parsed = profileSchema.safeParse({ name: formData.get("name"), locale: formData.get("locale") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, locale: parsed.data.locale };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "forbidden" };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { photo: "required" } };
  try {
    const url = await saveImage(file, "avatars", 512);
    await prisma.user.update({ where: { id: user.id }, data: { image: url } });
  } catch (error) {
    if (error instanceof ImageError) return { fieldErrors: { photo: error.code } };
    console.error("[uploadAvatar]", error);
    return { formError: "generic" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Starts account deletion (decision 89): signs out everywhere at once; signing in within
 * 30 days cancels it, after that the nightly job erases the account.
 */
export async function requestDeletionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "forbidden" };
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== user.email.toLowerCase()) return { fieldErrors: { confirm: "confirmEmail" } };

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { deletionRequestedAt: now } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  const locale = isLocale(user.locale) ? user.locale : "mk";
  try {
    await sendAuthEmail({
      to: user.email,
      name: user.name,
      locale,
      kind: "deletion",
      url: `${env.appUrl}/${locale}/sign-in`,
      date: formatDate(deletionDate(now)),
    });
  } catch (error) {
    console.error("[requestDeletion] email failed", error);
  }
  return { ok: true };
}
