import type { BusinessStatus } from "@svadba/db";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const tone = {
  DRAFT: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "accent",
  HIDDEN: "neutral",
} as const;

export function StatusBadge({ status }: { status: BusinessStatus }) {
  const t = useTranslations("vendor.status");
  return <Badge tone={tone[status]}>{t(status)}</Badge>;
}
