import "server-only";
import { prisma, type Prisma } from "@svadba/db";
import type { ThreadItem } from "@/components/inquiry/thread";

/** An inquiry with everything its thread page shows. `where` limits it to the viewer's wedding or business. */
export async function loadInquiry(where: Prisma.InquiryWhereInput) {
  const inquiry = await prisma.inquiry.findFirst({
    where,
    include: {
      business: { include: { halls: { orderBy: { sortOrder: "asc" } } } },
      wedding: true,
      event: true,
      hall: true,
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      offers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!inquiry) return null;
  const items: ThreadItem[] = [
    ...inquiry.messages.map((m) => ({
      kind: "message" as const,
      id: m.id,
      fromVendor: m.fromVendor,
      text: m.text,
      createdAt: m.createdAt,
      author: m.author?.name ?? null,
    })),
    ...inquiry.offers.map((o) => ({ kind: "offer" as const, ...o })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { inquiry, items };
}

/** Unread for one side: something happened after they last opened it. */
export function isUnread(i: { lastMessageAt: Date; coupleSeenAt: Date | null; vendorSeenAt: Date | null }, side: "couple" | "vendor") {
  const seen = side === "couple" ? i.coupleSeenAt : i.vendorSeenAt;
  return !seen || i.lastMessageAt > seen;
}
