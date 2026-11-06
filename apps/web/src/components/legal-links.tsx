import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Privacy and terms links for footers. */
export async function LegalLinks({ className }: { className?: string }) {
  const t = await getTranslations("legal");
  return (
    <nav aria-label={t("linksLabel")} className={cn("flex gap-4", className)}>
      <Link href="/privacy" className="hover:text-ink">
        {t("privacy")}
      </Link>
      <Link href="/terms" className="hover:text-ink">
        {t("terms")}
      </Link>
    </nav>
  );
}
