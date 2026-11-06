import { prisma } from "@svadba/db";
import { OPEN_INQUIRY_STATUSES, pickLocalized, type DayStatus, type Locale } from "@svadba/shared";
import { Globe, Mail, MapPin, MessageSquareText, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AddToWedding } from "@/components/public/add-to-wedding";
import { LocationMap } from "@/components/public/location-map";
import { ReviewForm } from "@/components/public/review-form";
import { Stars } from "@/components/public/stars";
import { ViewTracker } from "@/components/public/view-tracker";
import { FavoriteButton } from "@/components/search/favorite-button";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonthCalendar, type DayStatus as CalendarStatus } from "@/components/ui/month-calendar";
import { Stitch } from "@/components/ui/stitch";
import { canPreview } from "@/lib/business";
import { getCurrentUser } from "@/lib/session";
import { canEdit, getWeddingAccess } from "@/lib/wedding";
import { telLink, videoEmbedUrl, viberLink, whatsappLink } from "@/lib/contact";
import { calendarLabels, isoDate, monthTitle, todayIso } from "@/lib/dates";
import { formatApprox, formatDate, formatMoney } from "@/lib/format";
import { coupleNames } from "@/lib/plan-helpers";
import { canReview } from "@/lib/reviews";
import { favoriteContext } from "@/lib/visitor";
import { localeFrom } from "@/lib/locale";
import { cheapestOf } from "@/lib/search";
import { alternatesFor, OG_LOCALE } from "@/lib/seo";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

async function loadBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      city: true,
      photos: { where: { galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      galleries: { orderBy: { sortOrder: "asc" }, include: { photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
      halls: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      menuPackages: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      extras: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      servicePackages: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      travelFees: { include: { city: true } },
      features: { include: { feature: true } },
      genres: { include: { genre: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const locale = await localeFrom(params);
  const { slug } = await params;
  const b = await prisma.business.findUnique({
    where: { slug },
    include: {
      city: true,
      photos: { where: { galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
      menuPackages: { select: { pricePerPerson: true, currency: true } },
      servicePackages: { select: { price: true, currency: true } },
    },
  });
  if (!b || b.status !== "APPROVED") return { robots: { index: false } };

  // Link previews (decision 96): cover photo, plus category, city and "from" price in the description.
  const ts = await getTranslations({ locale, namespace: "search" });
  const city = b.city ? pickLocalized(b.city, "name", locale) : null;
  const perPerson = b.category === "VENUE";
  const cheapest = cheapestOf(
    perPerson
      ? b.menuPackages.map((m) => ({ amount: m.pricePerPerson, currency: m.currency }))
      : b.servicePackages.map((p) => ({ amount: p.price, currency: p.currency })),
  );
  const lead = [
    city ? ts("titleIn", { what: ts(`title.${b.category}`), city }) : ts(`title.${b.category}`),
    cheapest && `${ts("from")} ${formatMoney(cheapest.amount, cheapest.currency, locale)}${perPerson ? ` / ${ts("perPerson")}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const text = (pickLocalized(b, "description", locale) || b.descriptionMk).replace(/\s+/g, " ").trim();
  const description = `${lead}. ${text}`.slice(0, 200);
  const title = city ? `${b.name}, ${city}` : b.name;
  const path = `/v/${b.slug}`;
  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      images: b.photos[0] ? [{ url: b.photos[0].url, alt: b.name }] : [],
    },
    twitter: { card: b.photos[0] ? "summary_large_image" : "summary" },
  };
}

export default async function VendorPublicPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const locale = await localeFrom(params);
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) notFound();
  const isPublic = b.status === "APPROVED";
  if (!isPublic && !(await canPreview(b.id))) notFound();

  const t = await getTranslations("vendor");
  const tp = await getTranslations("vendor.public");
  const money = (amount: number, currency: "EUR" | "MKD") => formatMoney(amount, currency, locale);
  const description = pickLocalized(b, "description", locale) || b.descriptionMk;
  const cityName = b.city ? pickLocalized(b.city, "name", locale) : null;
  const [cover, ...rest] = b.photos;

  // "Add to my wedding" state for the visitor.
  const [user, weddingAccess] = await Promise.all([getCurrentUser(), getWeddingAccess()]);
  const inPlan = weddingAccess
    ? !!(await prisma.plannedVendor.findFirst({ where: { weddingId: weddingAccess.wedding.id, businessId: b.id } }))
    : false;
  const fav = await favoriteContext();
  const [openInquiry, reviews, myReview, reviewAllowed] = await Promise.all([
    weddingAccess
      ? prisma.inquiry.findFirst({
          where: { weddingId: weddingAccess.wedding.id, businessId: b.id, status: { in: [...OPEN_INQUIRY_STATUSES] } },
          select: { id: true },
        })
      : null,
    prisma.review.findMany({
      where: { businessId: b.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      include: { wedding: { select: { partner1: true, partner2: true, date: true } } },
    }),
    weddingAccess
      ? prisma.review.findUnique({ where: { businessId_weddingId: { businessId: b.id, weddingId: weddingAccess.wedding.id } } })
      : null,
    weddingAccess && canEdit(weddingAccess.memberRole) ? canReview(weddingAccess.wedding, b.id, weddingAccess.user.id) : false,
  ]);
  const tr = await getTranslations("reviews");
  const addState = !user
    ? "noAccount"
    : !weddingAccess
      ? "noWedding"
      : !canEdit(weddingAccess.role)
        ? "viewer"
        : inPlan
          ? "inPlan"
          : "ready";
  const packageOptions = [
    ...b.menuPackages.map((m) => ({
      kind: "menu" as const,
      id: m.id,
      label: `${pickLocalized(m, "name", locale)} · ${t("prices.perPerson", { price: money(m.pricePerPerson, m.currency) })}`,
    })),
    ...b.servicePackages.map((p) => ({
      kind: "package" as const,
      id: p.id,
      label: `${pickLocalized(p, "name", locale)} · ${money(p.price, p.currency)}`,
    })),
  ];

  // Structured data so search engines show the business with its rating (decision 95).
  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": b.category === "VENUE" ? "EventVenue" : "LocalBusiness",
        name: b.name,
        url: `${env.appUrl}/${locale}/v/${b.slug}`,
        description: (pickLocalized(b, "description", locale) || b.descriptionMk).slice(0, 500) || undefined,
        image: b.photos.slice(0, 5).map((p) => (p.url.startsWith("/") ? `${env.appUrl}${p.url}` : p.url)),
        telephone: b.phone ?? undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress: b.address ?? undefined,
          addressLocality: b.city ? pickLocalized(b.city, "name", locale) : undefined,
          addressCountry: "MK",
        },
        geo: b.lat != null && b.lng != null ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } : undefined,
        aggregateRating:
          b.ratingCount > 0 && b.ratingAvg != null
            ? { "@type": "AggregateRating", ratingValue: Number(b.ratingAvg.toFixed(1)), reviewCount: b.ratingCount }
            : undefined,
      }
    : null;

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON-LD must be inline; "<" is escaped so text can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {!isPublic && (
        <Alert className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span>{tp("preview")}</span>
          <ButtonLink href={`/vendor/${b.id}`} variant="secondary" size="sm">
            {tp("edit")}
          </ButtonLink>
        </Alert>
      )}

      {/* Photos: the cover plus up to four more; the grid adapts to how many there are. */}
      {cover && (
        <div
          className={cn(
            "grid gap-2 overflow-hidden rounded-[20px]",
            rest.length >= 4 ? "sm:grid-cols-4 sm:grid-rows-2" : rest.length > 0 ? "sm:grid-cols-3 sm:grid-rows-2" : "",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt={b.name}
            className={cn(
              "size-full object-cover",
              rest.length > 0 ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3] sm:aspect-[21/9]",
            )}
          />
          {rest.slice(0, rest.length >= 4 ? 4 : 2).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.url}
              alt=""
              loading="lazy"
              className={cn("hidden aspect-[4/3] size-full object-cover sm:block", rest.length === 1 && "sm:row-span-2 sm:aspect-auto")}
            />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          <header>
            <p className="text-sm font-medium text-vranec">{t(`categories.${b.category}`)}</p>
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{b.name}</h1>
            {cityName && (
              <p className="mt-3 flex items-center gap-1.5 text-ink-soft">
                <MapPin aria-hidden className="size-4" /> {cityName}
              </p>
            )}
            <Stitch className="mt-6 w-32" />
          </header>

          <Section title={tp("about")}>
            {description ? (
              <p className="whitespace-pre-line leading-relaxed text-ink-soft">{description}</p>
            ) : (
              <p className="text-stone">{tp("noDescription")}</p>
            )}
            {b.features.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {b.features.map(({ feature }) => (
                  <li key={feature.id} className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-soft">
                    {pickLocalized(feature, "name", locale)}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {b.halls.length > 0 && (
            <Section title={tp("halls")}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {b.halls.map((h) => (
                  <li key={h.id} className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-medium">{h.name}</p>
                    <p className="mt-1 text-sm text-stone tabular-nums">
                      {h.capacityMin
                        ? t("prices.guestsRange", { min: h.capacityMin, max: h.capacityMax })
                        : t("prices.guestsMax", { max: h.capacityMax })}
                    </p>
                    {h.description && <p className="mt-2 text-sm text-ink-soft">{h.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {b.menuPackages.length > 0 && (
            <Section title={tp("menus")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {b.menuPackages.map((m) => (
                  <Card key={m.id} className="flex flex-col p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold">{pickLocalized(m, "name", locale)}</h3>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      {money(m.pricePerPerson, m.currency)}
                      <span className="ml-1 text-sm font-normal text-stone">/ {t("prices.units.PER_PERSON")}</span>
                    </p>
                    <p className="text-xs text-stone tabular-nums">
                      {t("prices.approx", { price: formatApprox(m.pricePerPerson, m.currency, locale) })}
                      {m.minGuests ? ` · ${t("prices.minGuestsShort", { count: m.minGuests })}` : ""}
                    </p>
                    {m.courses.length > 0 && (
                      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm text-ink-soft">
                        {m.courses.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-4 text-sm">
                      <span className="font-medium">{t("prices.drinks")}: </span>
                      <span className="text-ink-soft">
                        {m.drinks === "CUSTOM" ? m.drinksNote : t(`prices.drinksOptions.${m.drinks}`)}
                        {m.drinks !== "CUSTOM" && m.drinksNote ? ` · ${m.drinksNote}` : ""}
                      </span>
                    </p>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {b.extras.length > 0 && (
            <Section title={tp("extras")}>
              <ul className="divide-y divide-line border-y border-line">
                {b.extras.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                    <span>{pickLocalized(e, "name", locale)}</span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      {money(e.price, e.currency)} {t(`prices.units.${e.unit}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {b.servicePackages.length > 0 && (
            <Section title={tp("packages")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {b.servicePackages.map((p) => (
                  <Card key={p.id} className="p-5">
                    <h3 className="text-lg font-semibold">{pickLocalized(p, "name", locale)}</h3>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{money(p.price, p.currency)}</p>
                    <p className="text-xs text-stone tabular-nums">
                      {[
                        t("prices.approx", { price: formatApprox(p.price, p.currency, locale) }),
                        p.hours ? t("prices.hoursShort", { count: p.hours }) : "",
                        p.members ? t("prices.membersShort", { count: p.members }) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {p.includes.length > 0 && (
                      <ul className="mt-4 list-disc space-y-1 border-t border-line pl-5 pt-4 text-sm text-ink-soft">
                        {p.includes.map((i, idx) => (
                          <li key={idx}>{i}</li>
                        ))}
                      </ul>
                    )}
                    {p.extraHourPrice != null && (
                      <p className="mt-3 text-sm text-stone">
                        {t("prices.extraHourShort", { price: money(p.extraHourPrice, p.currency) })}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {(b.genres.length > 0 || b.lineup) && (
            <Section title={tp("genres")}>
              {b.genres.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {b.genres.map(({ genre }) => (
                    <li key={genre.id} className="rounded-full bg-rosehip px-3 py-1 text-sm text-vranec-deep">
                      {pickLocalized(genre, "name", locale)}
                    </li>
                  ))}
                </ul>
              )}
              {b.lineup && (
                <p className="mt-4 text-ink-soft">
                  <span className="font-medium text-ink">{tp("lineup")}: </span>
                  {b.lineup}
                </p>
              )}
            </Section>
          )}

          {b.category === "BAND" && cityName && (
            <Section title={tp("travel")}>
              <ul className="divide-y divide-line border-y border-line text-sm">
                <li className="py-3 text-ink-soft">{tp("travelHome", { city: cityName })}</li>
                {b.travelFees
                  .map((f) => ({ ...f, name: pickLocalized(f.city, "name", locale) }))
                  .sort((x, y) => x.name.localeCompare(y.name, locale))
                  .map((f) => (
                    <li key={f.id} className="flex justify-between gap-4 py-3">
                      <span>{f.name}</span>
                      <span className="tabular-nums text-ink-soft">{money(f.price, f.currency)}</span>
                    </li>
                  ))}
                <li className="py-3 text-stone">{tp("travelAsk")}</li>
              </ul>
            </Section>
          )}

          {b.galleries.some((g) => g.photos.length > 0) && (
            <Section title={tp("portfolio")}>
              <div className="space-y-8">
                {b.galleries
                  .filter((g) => g.photos.length > 0)
                  .map((g) => (
                    <div key={g.id}>
                      <h3 className="mb-3 font-medium">{g.title}</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {g.photos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </Section>
          )}

          {b.videoLinks.length > 0 && (
            <Section title={tp("videos")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {b.videoLinks.map((v) => {
                  const embed = videoEmbedUrl(v.url);
                  return embed ? (
                    <iframe
                      key={v.id}
                      src={embed}
                      title={tp("videos")}
                      loading="lazy"
                      allow="encrypted-media; picture-in-picture; fullscreen"
                      className="aspect-video w-full rounded-xl border border-line"
                    />
                  ) : (
                    <a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex aspect-video items-center justify-center rounded-xl border border-line bg-surface p-4 text-center text-sm text-vranec hover:underline"
                    >
                      {new URL(v.url).hostname.replace(/^www\./, "")}
                    </a>
                  );
                })}
              </div>
            </Section>
          )}

          <Availability businessId={b.id} halls={b.halls} unmarked={b.unmarkedDays} locale={locale} fallbackName={b.name} />

          {isPublic && (
            <section id="reviews" className="scroll-mt-24">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="font-display text-2xl">{tr("title")}</h2>
                {b.ratingCount > 0 && b.ratingAvg != null && (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <Stars value={b.ratingAvg} label={tr("average", { rating: b.ratingAvg.toFixed(1) })} />
                    <span className="font-semibold text-ink tabular-nums">{b.ratingAvg.toFixed(1)}</span>
                    <span className="tabular-nums">{tr("count", { count: b.ratingCount })}</span>
                  </p>
                )}
              </div>
              <p className="-mt-2 mb-5 text-sm text-stone">{tr("verifiedNote")}</p>
              {reviewAllowed && (
                <div className="mb-6">
                  <ReviewForm businessId={b.id} existing={myReview ? { rating: myReview.rating, text: myReview.text } : null} />
                </div>
              )}
              {reviews.length === 0 ? (
                <p className="text-ink-soft">{tr("none")}</p>
              ) : (
                <ul className="space-y-6">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-t border-line pt-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Stars value={r.rating} label={tr("rated", { rating: r.rating })} />
                        <span className="font-medium">{coupleNames(r.wedding)}</span>
                        {r.wedding.date && (
                          <span className="text-sm text-stone tabular-nums">{tr("weddingOn", { date: formatDate(r.wedding.date) })}</span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{r.text}</p>
                      {r.vendorReply && (
                        <div className="mt-3 border-l-2 border-vranec/40 pl-4">
                          <p className="text-sm font-medium">{tr("replyFrom", { business: b.name })}</p>
                          <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{r.vendorReply}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Contact */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {isPublic && (
            <>
              <ViewTracker businessId={b.id} />
              <FavoriteButton businessId={b.id} initial={fav.favorites.has(b.id)} state={fav.state} variant="button" />
              {addState !== "viewer" && (
                <Card className="space-y-3 p-5">
                  <h2 className="font-display text-xl">{tp("inquiryTitle")}</h2>
                  <p className="text-sm text-ink-soft">{openInquiry ? tp("inquiryOpen") : tp("inquiryText")}</p>
                  <ButtonLink
                    href={
                      openInquiry
                        ? `/plan/inquiries/${openInquiry.id}`
                        : addState === "noAccount"
                          ? { pathname: "/sign-in", query: { next: `/plan/inquiries/new?vendor=${b.slug}` } }
                          : addState === "noWedding"
                            ? "/plan/new"
                            : { pathname: "/plan/inquiries/new", query: { vendor: b.slug } }
                    }
                    className="w-full"
                  >
                    <MessageSquareText aria-hidden className="size-4" />
                    {openInquiry ? tp("inquiryContinue") : tp("inquiryButton")}
                  </ButtonLink>
                </Card>
              )}
              <AddToWedding businessId={b.id} state={addState} packages={packageOptions} />
            </>
          )}
          <Card className="p-5">
            <h2 className="font-display text-xl">{tp("contact")}</h2>
            <div className="mt-4 grid gap-2">
              {b.phone && (
                <a href={telLink(b.phone)} className={buttonClass("primary", "md", "w-full")}>
                  <Phone aria-hidden className="size-4" /> {tp("call")} · <span className="tabular-nums">{b.phone}</span>
                </a>
              )}
              <div className="grid grid-cols-2 gap-2">
                {b.viber && (
                  <a href={viberLink(b.viber)} className={buttonClass("secondary", "md")}>
                    {tp("viber")}
                  </a>
                )}
                {b.whatsapp && (
                  <a href={whatsappLink(b.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                    {tp("whatsapp")}
                  </a>
                )}
              </div>
              {b.email && (
                <a href={`mailto:${b.email}`} className={buttonClass("ghost", "md", "justify-start")}>
                  <Mail aria-hidden className="size-4" /> {b.email}
                </a>
              )}
              {b.website && (
                <a href={b.website} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "md", "justify-start")}>
                  <Globe aria-hidden className="size-4" /> {tp("website")}
                </a>
              )}
              <div className="flex gap-2">
                {b.instagram && (
                  <a href={b.instagram} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                    Instagram
                  </a>
                )}
                {b.facebook && (
                  <a href={b.facebook} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                    Facebook
                  </a>
                )}
              </div>
            </div>
          </Card>
          {(b.address || (b.lat != null && b.lng != null)) && (
            <Card className="space-y-3 p-5">
              <h2 className="font-display text-xl">{tp("location")}</h2>
              {b.address && (
                <p className="text-sm text-ink-soft">
                  {b.address}
                  {cityName ? `, ${cityName}` : ""}
                </p>
              )}
              {b.lat != null && b.lng != null && (
                <>
                  <LocationMap lat={b.lat} lng={b.lng} label={tp("location")} />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-vranec hover:underline"
                  >
                    {tp("openInMaps")}
                  </a>
                </>
              )}
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

/** Next three months per calendar (each hall, or the business itself). */
async function Availability({
  businessId,
  halls,
  unmarked,
  locale,
  fallbackName,
}: {
  businessId: string;
  halls: { id: string; name: string }[];
  unmarked: "FREE" | "UNKNOWN";
  locale: Locale;
  fallbackName: string;
}) {
  const tp = await getTranslations("vendor.public");
  const today = todayIso();
  const [y, m] = today.split("-").map(Number) as [number, number];
  const months = [0, 1, 2].map((i) => ({ year: y + Math.floor((m - 1 + i) / 12), month: (m - 1 + i) % 12 }));
  const end = new Date(Date.UTC(months[2]!.year, months[2]!.month + 1, 1));
  const marked = await prisma.availabilityDay.findMany({
    where: { businessId, date: { gte: new Date(`${today}T00:00:00Z`), lt: end } },
    select: { calendarKey: true, date: true, status: true },
  });
  const byKey: Record<string, Record<string, DayStatus>> = {};
  for (const d of marked) (byKey[d.calendarKey] ??= {})[isoDate(d.date)] = d.status;
  const calendars = halls.length ? halls.map((h) => ({ key: h.id, name: h.name })) : [{ key: "main", name: fallbackName }];
  const cal = calendarLabels(await getTranslations({ locale, namespace: "common.calendar" }));
  const labels = cal.weekdays.map((l) => l.slice(0, 2));
  const toCalendar: Record<DayStatus, CalendarStatus> = { FREE: "free", TENTATIVE: "tentative", BOOKED: "booked" };

  return (
    <Section title={tp("availability")}>
      <p className="-mt-2 mb-5 text-sm text-stone">{unmarked === "FREE" ? tp("unmarkedFree") : tp("unmarkedUnknown")}</p>
      <div className="space-y-8">
        {calendars.map((c) => (
          <div key={c.key}>
            {calendars.length > 1 && <h3 className="mb-3 font-medium">{c.name}</h3>}
            <div className="grid gap-6 sm:grid-cols-3">
              {months.map(({ year, month }) => {
                const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
                const statuses: Record<number, CalendarStatus> = {};
                for (let d = 1; d <= days; d++) {
                  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  if (date < today) continue;
                  const s = byKey[c.key]?.[date];
                  if (s) statuses[d] = toCalendar[s];
                  else if (unmarked === "FREE") statuses[d] = "free";
                }
                return (
                  <div key={`${year}-${month}`} className={cn("rounded-xl border border-line bg-surface p-3")}>
                    <p className="mb-2 text-sm font-semibold">{monthTitle(year, month, cal)}</p>
                    <MonthCalendar year={year} month={month} statuses={statuses} weekdayLabels={labels} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
