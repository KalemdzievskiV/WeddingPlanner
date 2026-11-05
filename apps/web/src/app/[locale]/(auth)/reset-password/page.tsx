import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { InvalidToken, ResetForm } from "@/components/auth/reset-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.reset"))("title") };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations("auth.reset");
  return (
    <AuthCard title={t("title")}>{token && !error ? <ResetForm token={token} /> : <InvalidToken />}</AuthCard>
  );
}
