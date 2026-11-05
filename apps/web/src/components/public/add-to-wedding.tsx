"use client";

import { PLANNED_VENDOR_STATUSES, type Locale } from "@svadba/shared";
import { Check, HeartHandshake } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addCatalogVendorAction } from "@/actions/plan-tasks";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";

export type PackageOption = { kind: "menu" | "package"; id: string; label: string };

/** "Add to my wedding" card on a vendor's public page (decision 71). */
export function AddToWedding({
  businessId,
  state,
  packages,
}: {
  businessId: string;
  state: "noAccount" | "noWedding" | "viewer" | "ready" | "inPlan";
  packages: PackageOption[];
}) {
  const t = useTranslations("plan.addToWedding");
  const tv = useTranslations("plan.vendors");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"CONSIDERING" | "BOOKED">("CONSIDERING");
  const [pkg, setPkg] = useState("");
  const [added, setAdded] = useState(state === "inPlan");
  const [pending, start] = useTransition();

  if (state === "viewer") return null;
  if (state === "noAccount" || state === "noWedding") {
    return (
      <Card className="space-y-3 p-5">
        <p className="text-sm text-ink-soft">{t("needWedding")}</p>
        <ButtonLink href={state === "noAccount" ? "/sign-up" : "/plan/new"} variant="secondary" size="sm">
          {t("createPlan")}
        </ButtonLink>
      </Card>
    );
  }
  if (added && !open) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-olive">
          <Check aria-hidden className="size-4" /> {t("inPlan")}
        </span>
        <ButtonLink href="/plan/vendors" variant="ghost" size="sm">
          {t("openPlan")}
        </ButtonLink>
      </Card>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <HeartHandshake aria-hidden className="size-4" /> {t("button")}
      </Button>
    );
  }
  return (
    <Card className="space-y-4 p-5">
      <Field id="atw-status" label={t("status")}>
        <Select id="atw-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          {PLANNED_VENDOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tv(`statuses.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      {packages.length > 0 && (
        <Field id="atw-package" label={t("package")} hint={t("packageHint")}>
          <Select id="atw-package" value={pkg} onChange={(e) => setPkg(e.target.value)}>
            <option value="">{t("noPackage")}</option>
            {packages.map((p) => (
              <option key={p.id} value={`${p.kind}:${p.id}`}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const [kind, id] = pkg.split(":") as ["menu" | "package", string];
            const res = await addCatalogVendorAction(businessId, status, pkg ? { kind, id } : null, locale);
            if (res.ok) {
              setAdded(true);
              setOpen(false);
            }
          })
        }
      >
        {t("submit")}
      </Button>
    </Card>
  );
}
