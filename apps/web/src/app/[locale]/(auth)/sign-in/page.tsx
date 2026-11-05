import { localeFrom } from "@/lib/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard, Divider } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Link, redirect } from "@/i18n/navigation";
import { googleEnabled } from "@/lib/env";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.signIn"))("title") };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await localeFrom(params);
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect({ href: next ?? "/app", locale });
  const t = await getTranslations("auth");

  return (
    <>
      <AuthCard title={t("signIn.title")} lead={t("signIn.lead")}>
        {googleEnabled && (
          <>
            <GoogleButton next={next} />
            <Divider label={t("or")} />
          </>
        )}
        <SignInForm next={next} />
      </AuthCard>
      <p className="mt-6 text-center text-sm text-stone">
        {t("signIn.noAccount")}{" "}
        <Link href={next ? { pathname: "/sign-up", query: { next } } : "/sign-up"} className="font-medium text-vranec underline-offset-4 hover:underline">
          {t("signIn.signUpLink")}
        </Link>
      </p>
    </>
  );
}
