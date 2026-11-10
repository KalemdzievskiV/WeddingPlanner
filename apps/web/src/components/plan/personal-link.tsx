"use client";

import { Check, Link2, MessageCircle, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { guestRsvpTokenAction } from "@/actions/plan-guests";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Invite one family member on their own: a personal link that only answers for them.
 * The link is made the first time it's opened here, then stays the same.
 * `compact` (two-sides view): an icon in the guest's row, with the share buttons on a line below.
 * The parent row must be `flex flex-wrap` for that.
 */
export function PersonalLink({
  guest,
  rsvpBase,
  couple,
  editable,
  compact = false,
}: {
  guest: { id: string; name: string; rsvpToken: string | null };
  rsvpBase: string;
  couple: string;
  editable: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("plan.guests");
  const te = useTranslations("errors");
  const [token, setToken] = useState(guest.rsvpToken);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const url = token ? `${rsvpBase}/${token}` : "";
  const share = t("shareTextPersonal", { name: guest.name, couple, url });

  if (!token && !editable) return null;

  function toggle() {
    if (open || token) return setOpen((v) => !v);
    start(async () => {
      const res = await guestRsvpTokenAction(guest.id);
      if (res.token) {
        setToken(res.token);
        setOpen(true);
        setError(null);
      } else setError(te(res.formError && res.formError !== "emailTaken" ? res.formError : "generic"));
    });
  }

  const actions = open && token && (
    <>
      <button
        type="button"
        className={buttonClass("ghost", "sm")}
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check aria-hidden className="size-4 text-olive" /> : <Link2 aria-hidden className="size-4" />}
        <span>{copied ? t("copied") : t("copyLink")}</span>
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
        <MessageCircle aria-hidden className="size-4" /> {t("shareWhatsapp")}
      </a>
      <a href={`viber://forward?text=${encodeURIComponent(share)}`} className={buttonClass("ghost", "sm")}>
        {t("shareViber")}
      </a>
    </>
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-expanded={open}
          aria-label={`${t("personalLink")}: ${guest.name}`}
          title={t("personalLinkHint")}
          className={cn("grid size-8 place-items-center rounded-md text-stone hover:bg-rosehip hover:text-vranec", (open || token) && "text-vranec")}
        >
          <UserRound aria-hidden className="size-4" />
        </button>
        {(actions || error) && (
          <div className="order-last flex basis-full flex-wrap justify-end gap-1">
            {actions}
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        )}
      </>
    );
  }

  return (
    <span className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-expanded={open}
        title={t("personalLinkHint")}
        className={cn(buttonClass("ghost", "sm"), open && "bg-linen")}
      >
        <UserRound aria-hidden className="size-4" /> {t("personalLink")}
      </button>
      {actions}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
