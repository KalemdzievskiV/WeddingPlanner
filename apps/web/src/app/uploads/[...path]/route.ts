import { readFile } from "node:fs/promises";
import path from "node:path";
import { localUploadRoot } from "@/lib/storage";

// Serves images saved to the local upload folder (development, or hosting without R2).
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = localUploadRoot();
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep) || !file.endsWith(".webp")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
