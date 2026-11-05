import type { Locale, VendorCategory } from "@svadba/shared";
import { MapPin, Star, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/format";
import type { SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";
import { CompareToggle } from "./compare-toggle";
import { FavoriteButton, type FavoriteState } from "./favorite-button";

const FIT_STYLE = {
  free: "bg-olive-soft text-olive",
  tentative: "bg-amber-soft text-amber",
  ask: "bg-ink/5 text-ink-soft",
} as const;

export async function ResultCard({
  r,
  locale,
  date,
  favorite,
  favoriteState,
}: {
  r: SearchResult;
  locale: Locale;
  date: string | null;
  favorite: boolean;
  favoriteState: FavoriteState;
}) {
  const t = await getTranslations("search");
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/3] bg-rosehip">
        {r.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        )}
        <FavoriteButton businessId={r.id} initial={favorite} state={favoriteState} className="absolute right-3 top-3 z-10" />
        {r.dateFit && date && (
          <span className={cn("absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium", FIT_STYLE[r.dateFit])}>
            {t(`fit.${r.dateFit}`, { date: formatDate(date) })}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-lg font-semibold leading-snug">
            {/* The whole card is clickable through this link. */}
            <Link href={`/v/${r.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {r.name}
            </Link>
          </h3>
          {r.rating && (
            <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums" title={t("ratingTitle", { count: r.rating.count })}>
              <Star aria-hidden className="size-4 fill-amber text-amber" />
              {r.rating.avg.toFixed(1)}
              <span className="text-stone">({r.rating.count})</span>
            </span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone">
          {r.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5" /> {r.city}
            </span>
          )}
          {r.capacityMax && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Users aria-hidden className="size-3.5" /> {t("upTo", { count: r.capacityMax })}
            </span>
          )}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-sm text-ink-soft">
            {r.priceFrom ? (
              <>
                {t("from")}{" "}
                <span className="text-base font-semibold text-ink tabular-nums">{formatMoney(r.priceFrom.amount, r.priceFrom.currency, locale)}</span>
                {r.priceFrom.perPerson && <span className="text-stone"> / {t("perPerson")}</span>}
              </>
            ) : (
              <span className="text-stone">{t("askPrice")}</span>
            )}
          </p>
          <CompareToggle id={r.id} category={r.category as VendorCategory} className="relative z-10" />
        </div>
      </div>
    </article>
  );
}
