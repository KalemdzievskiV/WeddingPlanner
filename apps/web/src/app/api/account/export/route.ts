import { isLocale } from "@svadba/shared";
import { buildAccountExport } from "@/lib/export";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** "Download my data" (decision 91): a ZIP with the full JSON and Excel sheets. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const zip = await buildAccountExport(user.id, isLocale(user.locale) ? user.locale : "mk");
  const day = new Date().toISOString().slice(0, 10);
  return new Response(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="svadba-export-${day}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
