"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { setAdminRoleAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminRoleButton({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const t = useTranslations("admin.users");
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={isAdmin ? "danger" : "secondary"}
      disabled={pending}
      onClick={() => start(async () => void (await setAdminRoleAction(userId, !isAdmin)))}
    >
      {isAdmin ? t("removeAdmin") : t("makeAdmin")}
    </Button>
  );
}
