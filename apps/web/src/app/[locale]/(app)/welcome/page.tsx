import { localeFrom } from "@/lib/locale";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const user = await requireUser(locale);
  if (user.roles.length > 0) redirect({ href: "/app", locale });
  const t = await getTranslations("auth.welcome");
  return (
    <div className="mx-auto max-w-[420px]">
      <AuthCard title={t("title")} lead={t("lead")}>
        <WelcomeForm />
      </AuthCard>
    </div>
  );
}
