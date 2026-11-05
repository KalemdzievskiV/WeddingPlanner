import type { Currency, Locale, OfferUnit } from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { todayIso } from "@/lib/dates";
import { formatApprox, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OfferResponse } from "./thread-actions";

export type ThreadItem =
  | { kind: "message"; id: string; fromVendor: boolean; text: string; createdAt: Date; author: string | null }
  | {
      kind: "offer";
      id: string;
      price: number;
      unit: OfferUnit;
      currency: Currency;
      validUntil: Date | null;
      note: string | null;
      status: "OPEN" | "ACCEPTED" | "DECLINED" | "REPLACED";
      createdAt: Date;
    };

const OFFER_TONE = { OPEN: "warning", ACCEPTED: "success", DECLINED: "neutral", REPLACED: "neutral" } as const;

/**
 * Messages and offers in order. Your own side sits on the right.
 * Couples who can edit get accept/decline on the open offer.
 */
export async function InquiryThread({
  items,
  side,
  locale,
  canRespond,
  guestCount,
}: {
  items: ThreadItem[];
  side: "couple" | "vendor";
  locale: Locale;
  canRespond: boolean;
  guestCount: number | null;
}) {
  const t = await getTranslations("inquiries");
  const today = todayIso();

  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const mine = item.kind === "message" ? item.fromVendor === (side === "vendor") : side === "vendor";
        if (item.kind === "message") {
          return (
            <li key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]",
                  mine ? "rounded-br-md bg-rosehip" : "rounded-bl-md border border-line bg-surface",
                )}
              >
                <p className="whitespace-pre-line break-words leading-relaxed">{item.text}</p>
                <p className="mt-1.5 text-xs text-stone tabular-nums">
                  {item.author ? `${item.author} · ` : ""}
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            </li>
          );
        }
        const expired = item.status === "OPEN" && item.validUntil && item.validUntil.toISOString().slice(0, 10) < today;
        const total = item.unit === "PER_PERSON" && guestCount ? item.price * guestCount : null;
        return (
          <li key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "w-full max-w-md rounded-2xl border bg-surface p-5 shadow-[var(--shadow-card)]",
                item.status === "OPEN" ? "border-vranec/30" : "border-line",
                item.status === "REPLACED" && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-vranec">{t("offer.title")}</p>
                <Badge tone={OFFER_TONE[item.status]}>{t(`offer.status.${item.status}`)}</Badge>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {formatMoney(item.price, item.currency, locale)}
                <span className="ml-1.5 text-base font-normal text-stone">{t(`offer.units.${item.unit}`)}</span>
              </p>
              <p className="text-xs text-stone tabular-nums">
                {t("offer.approx", { price: formatApprox(item.price, item.currency, locale) })}
                {total != null && ` · ${t("offer.total", { guests: guestCount!, total: formatMoney(total, item.currency, locale) })}`}
              </p>
              {item.note && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{item.note}</p>}
              <p className="mt-3 text-xs text-stone tabular-nums">
                {formatDateTime(item.createdAt)}
                {item.validUntil && (
                  <span className={cn(expired && "text-danger")}>
                    {" · "}
                    {expired ? t("offer.expired", { date: formatDate(item.validUntil) }) : t("offer.validUntil", { date: formatDate(item.validUntil) })}
                  </span>
                )}
              </p>
              {side === "couple" && canRespond && item.status === "OPEN" && <OfferResponse offerId={item.id} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
