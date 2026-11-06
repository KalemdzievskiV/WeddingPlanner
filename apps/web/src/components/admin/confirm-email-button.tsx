"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { confirmEmailAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";

export function ConfirmEmailButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.users");
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await confirmEmailAction(userId)))}>
      {t("confirmEmail")}
    </Button>
  );
}
