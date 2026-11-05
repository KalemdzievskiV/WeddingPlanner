import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { JoinWeddingButton } from "@/components/plan/join-wedding";
import { Alert } from "@/components/ui/alert";
import { redirect } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { coupleNames } from "@/lib/plan-helpers";
import { getCurrentUser } from "@/lib/session";

export default async function JoinWeddingPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await localeFrom(params);
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: { pathname: "/sign-in", query: { next: `/plan/join/${token}` } }, locale });
  const t = await getTranslations("plan.join");
  const invite = await prisma.weddingInvite.findUnique({ where: { token }, include: { wedding: true } });
  const valid = invite && invite.expiresAt > new Date();

  return (
    <div className="mx-auto max-w-[440px]">
      <AuthCard title={t("title")}>
        {valid ? (
          <>
            <p className="mb-6 text-ink-soft">{t("text", { couple: coupleNames(invite.wedding) })}</p>
            <JoinWeddingButton token={token} label={t("submit")} />
          </>
        ) : (
          <Alert tone="error">{t("invalid")}</Alert>
        )}
      </AuthCard>
    </div>
  );
}
