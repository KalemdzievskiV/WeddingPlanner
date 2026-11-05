import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Stitch } from "@/components/ui/stitch";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Stitch className="mb-8 w-24" />
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <p className="mt-3 text-stone">{t("text")}</p>
      <ButtonLink href="/" className="mt-8">
        {t("home")}
      </ButtonLink>
    </main>
  );
}
