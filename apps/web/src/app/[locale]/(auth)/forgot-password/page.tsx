import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.forgot"))("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <AuthCard title={t("forgot.title")} lead={t("forgot.text")}>
        <ForgotForm />
      </AuthCard>
      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="font-medium text-vranec underline-offset-4 hover:underline">
          {t("checkEmail.back")}
        </Link>
      </p>
    </>
  );
}
