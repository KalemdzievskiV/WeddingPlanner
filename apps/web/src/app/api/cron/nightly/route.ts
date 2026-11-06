import { timingSafeEqual } from "node:crypto";
import { runNightly } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Nightly jobs (decision 97): archive, erasure warning, guest data erasure, deleted accounts. */
async function handle(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await runNightly();
    console.log("[cron:nightly]", JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    console.error("[cron:nightly] failed", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
