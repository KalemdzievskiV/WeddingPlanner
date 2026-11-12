import { prisma } from "@svadba/db";
import { INVITE_VIDEO_MAX_BYTES } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { deleteImage, saveVideo, VideoError } from "@/lib/storage";
import { editableWedding } from "@/lib/wedding";

/*
 * Invitation video upload (decision 131). A Route Handler rather than a Server Action, because videos
 * are far bigger than the Server Action body limit. The body is the raw file. One video per wedding:
 * a new upload replaces the old file, which is then deleted.
 */

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Only accept requests sent from our own pages. */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Reads the body, stopping as soon as it grows past the limit. */
async function readCapped(req: Request, max: number): Promise<Buffer | null> {
  if (!req.body) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const access = await editableWedding();
  if (!access) return json({ error: "forbidden" }, 403);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > INVITE_VIDEO_MAX_BYTES) return json({ error: "videoSize" }, 413);
  const data = await readCapped(req, INVITE_VIDEO_MAX_BYTES);
  if (!data) return json({ error: "videoSize" }, 413);
  if (data.length === 0) return json({ error: "required" }, 400);

  let url: string;
  try {
    url = await saveVideo(data, `weddings/${access.wedding.id}`, INVITE_VIDEO_MAX_BYTES);
  } catch (error) {
    if (error instanceof VideoError) return json({ error: error.code === "fileSize" ? "videoSize" : "videoType" }, 400);
    console.error("[inviteVideo]", error);
    return json({ error: "generic" }, 500);
  }

  // Read the current file again right before swapping, in case a partner uploaded meanwhile.
  const before = await prisma.wedding.findUnique({ where: { id: access.wedding.id }, select: { inviteVideoFile: true } });
  await prisma.wedding.update({ where: { id: access.wedding.id }, data: { inviteVideoFile: url } });
  if (before?.inviteVideoFile) await deleteImage(before.inviteVideoFile);
  revalidatePath("/", "layout");
  return json({ url });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const access = await editableWedding();
  if (!access) return json({ error: "forbidden" }, 403);
  const old = access.wedding.inviteVideoFile;
  if (old) {
    await prisma.wedding.update({ where: { id: access.wedding.id }, data: { inviteVideoFile: null } });
    await deleteImage(old);
  }
  revalidatePath("/", "layout");
  return json({ ok: true });
}
