import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { AcceptLinkButton } from "@/components/vendor/accept-link";
import { redirect } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";

export default async function JoinPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await localeFrom(params);
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: { pathname: "/sign-in", query: { next: `/vendor/join/${token}` } }, locale });
  const t = await getTranslations("vendor.join");
  const now = new Date();
  const invite = await prisma.businessInvite.findUnique({ where: { token }, include: { business: true } });
  const valid = invite && invite.expiresAt > now;

  return (
    <div className="mx-auto max-w-[440px]">
      <AuthCard title={t("title")}>
        {valid ? (
          <>
            <p className="mb-6 text-ink-soft">{t("text", { name: invite.business.name })}</p>
            <AcceptLinkButton kind="join" token={token} label={t("submit")} />
          </>
        ) : (
          <Alert tone="error">{t("invalid")}</Alert>
        )}
      </AuthCard>
    </div>
  );
}
