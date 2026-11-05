"use client";

import { Link2, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createInviteAction, removeMemberAction, revokeInviteAction } from "@/actions/vendor";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

export function RemoveMemberButton({ businessId, memberId, name }: { businessId: string; memberId: string; name: string }) {
  const t = useTranslations("vendor.team");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(t("confirmRemove", { name }))) start(async () => void (await removeMemberAction(businessId, memberId)));
      }}
    >
      <UserMinus aria-hidden className="size-4" /> {t("remove")}
    </Button>
  );
}

export function CreateInviteButton({ businessId, baseUrl }: { businessId: string; baseUrl: string }) {
  const t = useTranslations("vendor.team");
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await createInviteAction(businessId);
            if (res.token) setLink(`${baseUrl}/${res.token}`);
          })
        }
      >
        <Link2 aria-hidden className="size-4" /> {t("invite")}
      </Button>
      {link && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 truncate rounded-lg bg-linen px-3 py-2 text-sm">{link}</code>
          <CopyButton text={link} />
        </div>
      )}
    </div>
  );
}

export function RevokeInviteButton({ businessId, inviteId }: { businessId: string; inviteId: string }) {
  const t = useTranslations("vendor.team");
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await revokeInviteAction(businessId, inviteId)))}>
      {t("revoke")}
    </Button>
  );
}
