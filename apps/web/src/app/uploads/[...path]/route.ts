import { open, stat } from "node:fs/promises";
import path from "node:path";
import { localUploadRoot } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};
const CACHE = "public, max-age=31536000, immutable";
const CHUNK = 2 * 1024 * 1024;

// Serves images and invitation videos saved to the local upload folder (development, or hosting without R2).
// Videos need byte ranges: Safari won't play a video without them, and they let guests seek.
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = localUploadRoot();
  const file = path.resolve(root, ...parts);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(root + path.sep) || !type) return new Response("Not found", { status: 404 });

  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = size - 1;
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1]);
      // Open-ended ranges get a chunk at a time, so a big video is never read into memory at once.
      end = Math.min(range[2] ? Number(range[2]) : start + CHUNK - 1, size - 1);
    } else {
      start = Math.max(0, size - Number(range[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }

  const length = end - start + 1;
  const handle = await open(file);
  try {
    const data = Buffer.alloc(length);
    await handle.read(data, 0, length, start);
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Content-Length": String(length),
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE,
    };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    return new Response(new Uint8Array(data), { status: range ? 206 : 200, headers });
  } finally {
    await handle.close();
  }
}
