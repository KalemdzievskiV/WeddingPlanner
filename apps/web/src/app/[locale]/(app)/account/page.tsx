import { localeFrom } from "@/lib/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AvatarForm, ProfileForm } from "@/components/account/account-forms";
import { EmailToggle } from "@/components/notifications/list";
import { Card } from "@/components/ui/card";
import { prisma } from "@svadba/db";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("title") };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const user = await requireUser(locale);
  const t = await getTranslations("account");
  const settings = await prisma.user.findUnique({ where: { id: user.id }, select: { emailNotifications: true } });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <Card className="mt-8 p-6 sm:p-8">
        <AvatarForm name={user.name} image={user.image} />
      </Card>
      <Card className="mt-5 p-6 sm:p-8">
        <ProfileForm name={user.name} email={user.email} locale={user.locale} />
      </Card>
      <Card className="mt-5 p-6 sm:p-8">
        <EmailToggle enabled={settings?.emailNotifications ?? true} />
      </Card>
    </div>
  );
}
