"use server";

import { prisma } from "@svadba/db";
import { profileSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
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
