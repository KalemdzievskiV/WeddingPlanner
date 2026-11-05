import { localeFrom } from "@/lib/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard, Divider } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Link, redirect } from "@/i18n/navigation";
import { googleEnabled } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.signUp"))("title") };
}

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const locale = await localeFrom(params);
  const { type } = await searchParams;
  if (await getCurrentUser()) redirect({ href: "/app", locale });
  const t = await getTranslations("auth");

  return (
    <>
      <AuthCard title={t("signUp.title")} lead={t("signUp.lead")}>
        {googleEnabled && (
          <>
            <GoogleButton />
            <Divider label={t("or")} />
          </>
        )}
        <SignUpForm defaultType={type === "vendor" ? "VENDOR" : "COUPLE"} />
      </AuthCard>
      <p className="mt-6 text-center text-sm text-stone">
        {t("signUp.haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-vranec underline-offset-4 hover:underline">
          {t("signUp.signInLink")}
        </Link>
      </p>
    </>
  );
}
