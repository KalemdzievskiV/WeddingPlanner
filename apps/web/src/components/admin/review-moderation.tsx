"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { dismissReportAction, setReviewStatusAction } from "@/actions/reviews";
import { Button } from "@/components/ui/button";

export function ReviewModeration({ id, status, reported }: { id: string; status: "VISIBLE" | "HIDDEN"; reported: boolean }) {
  const t = useTranslations("admin.reviews");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "VISIBLE" ? (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => void (await setReviewStatusAction(id, "HIDDEN")))}>
          {t("hide")}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await setReviewStatusAction(id, "VISIBLE")))}>
          {t("show")}
        </Button>
      )}
      {reported && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await dismissReportAction(id)))}>
          {t("dismiss")}
        </Button>
      )}
    </div>
  );
}
