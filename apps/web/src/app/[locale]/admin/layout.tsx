import { localeFrom } from "@/lib/locale";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui/logo";
import { UserMenu } from "@/components/user-menu";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await localeFrom(params);
  const user = await requireAdmin(locale);
  const t = await getTranslations("admin.nav");
  const tc = await getTranslations("common");

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-line bg-surface px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:px-3">
          <Link href="/admin" className="rounded">
            <Logo name={tc("appName")} />
          </Link>
          <span className="rounded-full bg-vranec px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
            {tc("admin")}
          </span>
        </div>
        <AdminNav />
        <Link
          href="/"
          className="mt-6 hidden items-center gap-2 px-3 text-sm text-stone hover:text-ink lg:flex"
        >
          <ArrowLeft aria-hidden className="size-4" /> {t("backToSite")}
        </Link>
      </aside>
      <div className="min-w-0 bg-linen">
        <div className="flex h-14 items-center justify-end gap-2 border-b border-line px-4 sm:px-8">
          <LanguageSwitcher />
          <UserMenu name={user.name} image={user.image} isAdmin />
        </div>
        <main id="main" className="px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
