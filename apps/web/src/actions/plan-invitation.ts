"use server";

import { prisma } from "@svadba/db";
import { revalidatePath } from "next/cache";
import { videoInviteSchema } from "@svadba/shared";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { deleteImage, ImageError, saveImage } from "@/lib/storage";
import { editableWedding } from "@/lib/wedding";

/** Invitations carry small print, so they are kept larger than other photos. */
const INVITATION_SIZE = 2400;

/** Sets or replaces the invitation picture shown on RSVP pages. */
export async function uploadInvitationAction(formData: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const file = formData.get("invitation");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { invitation: "required" } };
  const old = access.wedding.invitationUrl;
  try {
    const url = await saveImage(file, `weddings/${access.wedding.id}`, INVITATION_SIZE);
    await prisma.wedding.update({ where: { id: access.wedding.id }, data: { invitationUrl: url } });
  } catch (error) {
    if (error instanceof ImageError) return { fieldErrors: { invitation: error.code } };
    console.error("[uploadInvitation]", error);
    return { formError: "generic" };
  }
  if (old) await deleteImage(old);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeInvitationAction(): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const old = access.wedding.invitationUrl;
  if (!old) return { ok: true };
  await prisma.wedding.update({ where: { id: access.wedding.id }, data: { invitationUrl: null } });
  await deleteImage(old);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Saves the invitation settings (the "Invitation" tab). */
export async function saveVideoInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = videoInviteSchema.safeParse({
    enabled: fd.get("enabled") === "on",
    videoUrl: fd.get("videoUrl") ?? "",
    headline: fd.get("headline") ?? "",
    message: fd.get("message") ?? "",
    overlay: fd.get("overlay") ?? "",
    eventIds: fd.getAll("eventIds"),
    theme: fd.get("theme") ?? "",
    music: fd.get("music") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { enabled, videoUrl, headline, message, overlay, theme, music } = parsed.data;
  // Only this wedding's events.
  const events = await prisma.weddingEvent.findMany({
    where: { weddingId: access.wedding.id, id: { in: parsed.data.eventIds } },
    select: { id: true },
  });
  await prisma.wedding.update({
    where: { id: access.wedding.id },
    data: {
      inviteEnabled: enabled,
      inviteVideoUrl: videoUrl,
      inviteHeadline: headline,
      inviteMessage: message,
      inviteOverlay: overlay,
      inviteEventIds: events.map((e) => e.id),
      inviteTheme: theme,
      inviteMusic: music,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
