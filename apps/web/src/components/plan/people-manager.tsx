"use client";

import { INVITE_ROLES, type InviteRole } from "@svadba/shared";
import { Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  createWeddingInviteAction,
  deleteWeddingAction,
  leaveWeddingAction,
  removeWeddingMemberAction,
  revokeWeddingInviteAction,
} from "@/actions/plan-wedding";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function InviteCreator({ baseUrl }: { baseUrl: string }) {
  const t = useTranslations("plan.settings");
  const [role, setRole] = useState<InviteRole>("PARTNER");
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-96">
          <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium">
            {t("inviteRole")}
          </label>
          <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as InviteRole)}>
            {INVITE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`inviteRoles.${r}`)}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createWeddingInviteAction(role);
              if (res.token) setLink(`${baseUrl}/${res.token}`);
            })
          }
        >
          <Link2 aria-hidden className="size-4" /> {t("createLink")}
        </Button>
      </div>
      {link && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 truncate rounded-lg bg-linen px-3 py-2 text-sm">{link}</code>
          <CopyButton text={link} />
        </div>
      )}
    </div>
  );
}

export function SmallAction({
  kind,
  id,
  label,
  confirmText,
}: {
  kind: "removeMember" | "revoke" | "leave" | "deleteWedding";
  id?: string;
  label: string;
  confirmText?: string;
}) {
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = () => {
    switch (kind) {
      case "removeMember":
        return removeWeddingMemberAction(id!);
      case "revoke":
        return revokeWeddingInviteAction(id!);
      case "leave":
        return leaveWeddingAction(locale);
      case "deleteWedding":
        return deleteWeddingAction(locale);
    }
  };
  return (
    <Button
      variant={kind === "deleteWedding" ? "danger" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => void (await run()));
      }}
    >
      {label}
    </Button>
  );
}
