import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
