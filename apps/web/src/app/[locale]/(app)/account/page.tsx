import { localeFrom } from "@/lib/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AvatarForm, ProfileForm } from "@/components/account/account-forms";
import { DeleteAccount, ExportData } from "@/components/account/data-forms";
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
  const settings = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      emailNotifications: true,
      weddingMember: { select: { role: true } },
      memberships: { where: { role: "OWNER" }, select: { business: { select: { name: true } } } },
    },
  });
  const td = await getTranslations("account.delete");
  const consequences = [
    ...(settings?.weddingMember?.role === "OWNER" ? [td("weddingOwner")] : settings?.weddingMember ? [td("weddingMember")] : []),
    ...(settings?.memberships ?? []).map((m) => td("business", { business: m.business.name })),
    td("restore"),
  ];

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
      <Card className="mt-5 p-6 sm:p-8">
        <ExportData />
      </Card>
      <Card className="mt-5 p-6 sm:p-8">
        <DeleteAccount email={user.email} consequences={consequences} />
      </Card>
    </div>
  );
}
