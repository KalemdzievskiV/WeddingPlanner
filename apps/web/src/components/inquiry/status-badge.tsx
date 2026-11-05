import type { InquiryStatus } from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

const TONE = {
  NEW: "accent",
  REPLIED: "neutral",
  OFFER_SENT: "warning",
  BOOKED: "success",
  DECLINED: "neutral",
  CANCELLED: "neutral",
} as const;

/** Status label; vendors and couples see slightly different words for NEW. */
export async function InquiryStatusBadge({ status, side }: { status: InquiryStatus; side: "couple" | "vendor" }) {
  const t = await getTranslations("inquiries.status");
  return <Badge tone={TONE[status]}>{t(status === "NEW" && side === "couple" ? "SENT" : status)}</Badge>;
}
