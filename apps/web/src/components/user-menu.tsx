"use client";

import { LogOut, Settings, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, image, isAdmin }: { name: string; image: string | null; isAdmin: boolean }) {
  const t = useTranslations("common");
  const router = useRouter();
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={t("account")}
        className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-line-strong bg-rosehip text-sm font-medium text-vranec-deep [&::-webkit-details-marker]:hidden"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          name.trim().charAt(0).toUpperCase()
        )}
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
        <p className="truncate px-3 pb-2 pt-2 text-sm font-medium">{name}</p>
        <Link href="/account" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-linen">
          <Settings aria-hidden className="size-4" /> {t("account")}
        </Link>
        {isAdmin && (
          <Link href="/admin" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-linen">
            <Shield aria-hidden className="size-4" /> {t("admin")}
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-linen"
        >
          <LogOut aria-hidden className="size-4" /> {t("signOut")}
        </button>
      </div>
    </details>
  );
}
