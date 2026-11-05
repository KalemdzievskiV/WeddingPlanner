import { localeFrom } from "@/lib/locale";
import { ArrowRight, Heart, Shield, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stitch } from "@/components/ui/stitch";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("common"))("dashboard") };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const user = await requireUser(locale);
  if (user.roles.length === 0) redirect({ href: "/welcome", locale });
  const t = await getTranslations("app");

  return (
    <>
      <h1 className="font-display text-4xl">{t("greeting", { name: user.name.split(" ")[0] ?? user.name })}</h1>
      <Stitch className="mt-5 w-28" />
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {user.roles.includes("COUPLE") && (
          <RoleCard icon={<Heart aria-hidden className="size-5" />} title={t("coupleTitle")} text={t("coupleText")} badge={t("inProgress")} />
        )}
        {user.roles.includes("VENDOR") && (
          <RoleCard icon={<Store aria-hidden className="size-5" />} title={t("vendorTitle")} text={t("vendorText")}>
            <ButtonLink href="/vendor" variant="secondary" size="sm" className="mt-5">
              {t("openVendor")} <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </RoleCard>
        )}
        {user.roles.includes("ADMIN") && (
          <RoleCard icon={<Shield aria-hidden className="size-5" />} title={t("adminTitle")} text={t("adminText")}>
            <ButtonLink href="/admin" variant="secondary" size="sm" className="mt-5">
              {t("openAdmin")} <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </RoleCard>
        )}
      </div>
    </>
  );
}

function RoleCard({
  icon,
  title,
  text,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-full bg-rosehip text-vranec">{icon}</span>
        {badge && <Badge tone="warning">{badge}</Badge>}
      </div>
      <h2 className="mt-5 font-display text-2xl">{title}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{text}</p>
      {children}
    </Card>
  );
}
