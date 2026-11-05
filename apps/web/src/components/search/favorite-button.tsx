"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/actions/marketplace";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** What a visitor can do with favourites: signed out → sign in, no wedding → create one, view-only → nothing. */
export type FavoriteState = "ready" | "signIn" | "noWedding" | "viewer";

export function FavoriteButton({
  businessId,
  initial,
  state,
  variant = "icon",
  className,
}: {
  businessId: string;
  initial: boolean;
  state: FavoriteState;
  variant?: "icon" | "button";
  className?: string;
}) {
  const t = useTranslations("search.favorite");
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();

  if (state === "viewer") return null;

  function click() {
    if (state === "signIn") return router.push({ pathname: "/sign-in", query: { next: pathname } });
    if (state === "noWedding") return router.push("/plan/new");
    const next = !saved;
    setSaved(next);
    start(async () => {
      const res = await toggleFavoriteAction(businessId);
      if (!res.ok) setSaved(!next);
      else if (typeof res.favorite === "boolean") setSaved(res.favorite);
    });
  }

  const label = saved ? t("remove") : t("add");
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-[15px] font-medium transition-colors",
          saved ? "border-vranec/30 bg-rosehip text-vranec-deep" : "border-line-strong bg-surface text-ink hover:border-ink-soft",
          className,
        )}
      >
        <Heart aria-hidden className={cn("size-4", saved && "fill-current")} />
        {saved ? t("saved") : t("add")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur transition-colors hover:text-vranec",
        saved && "text-vranec",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-[18px]", saved && "fill-current")} />
    </button>
  );
}
