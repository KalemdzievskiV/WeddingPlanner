import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "./env";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageError extends Error {
  constructor(public code: "fileType" | "fileSize") {
    super(code);
  }
}

let s3: S3Client | null = null;
function r2Client() {
  if (!env.r2) return null;
  s3 ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
  });
  return s3;
}

/** Absolute path of the local upload folder (used when R2 isn't configured). */
export function localUploadRoot() {
  return path.resolve(env.uploadDir);
}

/**
 * Validates, re-encodes to WebP (max 1600px, EXIF stripped, rotation applied) and stores an image.
 * Returns its public URL. Goes to Cloudflare R2 when configured, otherwise to UPLOAD_DIR.
 */
export async function saveImage(file: File, folder: string, maxSize = 1600): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new ImageError("fileType");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("fileSize");

  let output: Buffer;
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageError("fileType");
  }

  const key = `${folder.replace(/[^a-z0-9/-]/gi, "")}/${randomUUID()}.webp`;
  const client = r2Client();
  if (client && env.r2) {
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: output,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${env.r2.publicUrl}/${key}`;
  }

  const target = path.join(localUploadRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output);
  return `/uploads/${key}`;
}

export class VideoError extends Error {
  constructor(public code: "fileType" | "fileSize") {
    super(code);
  }
}

/** Works out a video's real format from its first bytes: MP4 / MOV (ISO media) or WebM. */
export function sniffVideo(head: Uint8Array): { ext: "mp4" | "mov" | "webm"; type: string } | null {
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return { ext: "webm", type: "video/webm" };
  }
  if (head.length < 12) return null;
  const box = String.fromCharCode(...head.slice(4, 8));
  if (box === "ftyp") {
    const brand = String.fromCharCode(...head.slice(8, 12));
    return brand === "qt  " ? { ext: "mov", type: "video/quicktime" } : { ext: "mp4", type: "video/mp4" };
  }
  // Older QuickTime files can start with these boxes instead.
  if (["moov", "wide", "mdat", "free"].includes(box)) return { ext: "mov", type: "video/quicktime" };
  return null;
}

/**
 * Stores an uploaded video as is (no re-encoding) after checking its real format.
 * Returns its public URL. Goes to Cloudflare R2 when configured, otherwise to UPLOAD_DIR.
 */
export async function saveVideo(data: Buffer, folder: string, maxBytes: number): Promise<string> {
  if (data.length > maxBytes) throw new VideoError("fileSize");
  const kind = sniffVideo(data.subarray(0, 12));
  if (!kind) throw new VideoError("fileType");

  const key = `${folder.replace(/[^a-z0-9/-]/gi, "")}/${randomUUID()}.${kind.ext}`;
  const client = r2Client();
  if (client && env.r2) {
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: data,
        ContentType: kind.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${env.r2.publicUrl}/${key}`;
  }

  const target = path.join(localUploadRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return `/uploads/${key}`;
}

/** Deletes a stored image (or video) by its public URL. Best effort: a missing file is not an error. */
export async function deleteImage(url: string) {
  try {
    const client = r2Client();
    if (client && env.r2 && url.startsWith(`${env.r2.publicUrl}/`)) {
      await client.send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: url.slice(env.r2.publicUrl.length + 1) }));
    } else if (url.startsWith("/uploads/")) {
      const root = localUploadRoot();
      const file = path.resolve(root, url.slice("/uploads/".length));
      if (file.startsWith(root + path.sep)) await rm(file, { force: true });
    }
  } catch (error) {
    console.error("[deleteImage]", url, error);
  }
}
