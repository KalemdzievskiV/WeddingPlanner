import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { AcceptLinkButton } from "@/components/vendor/accept-link";
import { redirect } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

export default async function ClaimPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await localeFrom(params);
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: { pathname: "/sign-in", query: { next: `/vendor/claim/${token}` } }, locale });
  const t = await getTranslations("vendor.claim");
  const now = new Date();
  const business = await prisma.business.findUnique({ where: { claimToken: token } });
  const valid = business && business.claimExpiresAt && business.claimExpiresAt > now;

  return (
    <div className="mx-auto max-w-[440px]">
      <AuthCard title={t("title")}>
        {valid ? (
          <>
            <p className="mb-6 text-ink-soft">{t("text", { name: business.name })}</p>
            <AcceptLinkButton kind="claim" token={token} label={t("submit")} />
          </>
        ) : (
          <Alert tone="error">{t("invalid")}</Alert>
        )}
      </AuthCard>
    </div>
  );
}
