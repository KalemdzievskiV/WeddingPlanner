import { prisma } from "@svadba/db";
import { pickLocalized } from "@svadba/shared";
import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/vendor/status-badge";
import { Link } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("vendor.list"))("title") };
}

export default async function VendorHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const user = await requireUser(locale);
  const t = await getTranslations("vendor");
  const memberships = await prisma.businessMember.findMany({
    where: { userId: user.id },
    include: { business: { include: { city: true, photos: { orderBy: { sortOrder: "asc" }, take: 1, where: { galleryId: null } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">{t("list.title")}</h1>
        <ButtonLink href="/vendor/new">
          <Plus aria-hidden className="size-4" /> {t("list.add")}
        </ButtonLink>
      </div>

      {memberships.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-ink-soft">{t("list.empty")}</p>
          <ButtonLink href="/vendor/new" className="mt-6">
            {t("list.add")}
          </ButtonLink>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {memberships.map(({ business: b, role }) => (
            <li key={b.id}>
              <Link href={`/vendor/${b.id}`} className="block rounded-[var(--radius-card)]">
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-rosehip">
                    {b.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.photos[0].url} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.name}</p>
                    <p className="mt-0.5 text-sm text-stone">
                      {t(`categories.${b.category}`)}
                      {b.city && ` · ${pickLocalized(b.city, "name", locale)}`} · {t(`list.role.${role}`)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                  <ChevronRight aria-hidden className="size-5 text-stone" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
