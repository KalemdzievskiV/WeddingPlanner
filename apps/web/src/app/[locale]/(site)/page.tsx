import { localeFrom } from "@/lib/locale";
import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonthCalendar, type DayStatus } from "@/components/ui/month-calendar";
import { Stitch } from "@/components/ui/stitch";
import { HomeSearch } from "@/components/search/home-search";
import { cityOptions } from "@/lib/cities";
import { calendarLabels, todayIso } from "@/lib/dates";

// Sample data for the product preview in the hero.
const SAMPLE_DAYS_LEFT = 219;
const juneStatuses: Record<number, DayStatus> = {
  5: "booked", 6: "booked", 12: "free", 13: "tentative", 19: "booked", 20: "booked",
  26: "booked", 27: "free", 4: "free", 11: "free", 18: "tentative", 25: "free",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { alternates: alternatesFor("", await localeFrom(params)) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const format = await getFormatter();
  const cities = (await cityOptions(locale)).map((c) => ({ slug: c.slug, name: c.name }));
  const eur = (n: number) => format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <main id="main">
      {/* Hero: the promise on the left, the product itself on the right. */}
      <section className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pt-20">
        <div>
          <p className="text-sm font-medium text-vranec">{t("eyebrow")}</p>
          <h1 className="mt-5 font-display text-[2.6rem] leading-[1.08] tracking-[-0.01em] text-balance sm:text-6xl">
            {t("title")}
          </h1>
          <Stitch className="mt-7 w-40" />
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty">{t("lead")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/sign-up" size="lg">
              {t("ctaCouple")}
            </ButtonLink>
            <ButtonLink href="/sign-up?type=vendor" size="lg" variant="secondary">
              {t("ctaVendor")}
            </ButtonLink>
          </div>
        </div>

        <Card className="relative p-5 sm:p-7" aria-hidden>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone">{t("preview.label")}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{t("preview.date")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-rosehip px-3 py-1 text-sm text-vranec-deep tabular-nums">
              {t("preview.countdown", { days: SAMPLE_DAYS_LEFT })}
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-stone">{t("preview.guests")}</span>
                <span className="text-xl font-semibold tabular-nums">286</span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                <div className="w-[53%] bg-vranec" />
                <div className="flex-1 bg-vranec/30" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-stone">
                <span>{t("preview.brideSide")} · 152</span>
                <span>{t("preview.groomSide")} · 134</span>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm text-stone">{t("preview.budget")}</span>
                <span className="text-sm tabular-nums">
                  {t("preview.spentOf", { spent: eur(14200), total: eur(21500) })}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.07]">
                <div className="h-full w-[66%] rounded-full bg-olive" />
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-6 border-t border-line pt-6 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-medium">{t("preview.freeOnDate")}</p>
              <ul className="mt-3 space-y-3">
                {[
                  { name: t("preview.venueA"), price: 28, capacity: 400 },
                  { name: t("preview.venueB"), price: 35, capacity: 250 },
                ].map((v) => (
                  <li key={v.name} className="rounded-lg border border-line px-3 py-2.5">
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="mt-0.5 text-xs text-stone tabular-nums">
                      {t("preview.perPerson", { price: eur(v.price) })} · {t("preview.upTo", { count: v.capacity })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:w-52">
              <p className="mb-2 text-sm font-medium">{t("preview.calendar")}</p>
              <MonthCalendar
                year={2027}
                month={5}
                statuses={juneStatuses}
                weekdayLabels={calendarLabels(await getTranslations("common.calendar")).weekdays.map((d) => d.slice(0, 2))}
                highlight={12}
              />
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone">
                <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-olive" />{t("preview.free")}</span>
                <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-amber" />{t("preview.tentative")}</span>
                <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-stone/50" />{t("preview.booked")}</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Search the catalog */}
      <section aria-labelledby="home-search" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 id="home-search" className="mb-4 font-display text-2xl sm:text-3xl">
          {t("search.title")}
        </h2>
        <HomeSearch cities={cities} today={todayIso()} />
      </section>

      {/* Couples */}
      <section id="couples" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">{t("couples.title")}</h2>
            <p className="mt-4 max-w-sm text-ink-soft">{t("couples.lead")}</p>
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {(["guests", "budget", "checklist", "seating"] as const).map((key) => (
              <div key={key} className="border-t border-line-strong pt-5">
                <dt className="font-display text-xl">{t(`couples.${key}Title`)}</dt>
                <dd className="mt-2 leading-relaxed text-ink-soft">{t(`couples.${key}Text`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Vendors */}
      <section id="vendors" className="scroll-mt-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[20px] bg-rosehip px-6 py-14 sm:px-12">
          <h2 className="max-w-2xl font-display text-3xl text-vranec-deep sm:text-4xl">{t("vendors.title")}</h2>
          <p className="mt-4 max-w-2xl text-ink-soft">{t("vendors.lead")}</p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {(["venue", "band", "photo"] as const).map((key) => (
              <div key={key}>
                <h3 className="font-medium text-ink">{t(`vendors.${key}Title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(`vendors.${key}Text`)}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/sign-up?type=vendor" className="mt-10">
            {t("vendors.cta")}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
