"use client";

import { PLANNED_VENDOR_STATUSES } from "@svadba/shared";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { deletePlannedVendorAction, savePlannedVendorAction, setPlannedVendorStatusAction } from "@/actions/plan-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export type VendorRow = {
  id: string;
  name: string;
  kind: string | null;
  contact: string | null;
  status: "CONSIDERING" | "BOOKED";
  notes: string | null;
  slug: string | null;
  inBudget: string | null;
};

export function VendorList({ vendors, editable }: { vendors: VendorRow[]; editable: boolean }) {
  const t = useTranslations("plan.vendors");
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">{t("lead")}</p>
        {editable && (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> {t("add")}
          </Button>
        )}
      </div>
      {editing === "new" && (
        <Card className="border-vranec/30 p-5">
          <VendorForm vendor={null} onDone={() => setEditing(null)} />
        </Card>
      )}
      {vendors.length === 0 && editing !== "new" ? (
        <Card className="p-10 text-center text-ink-soft">{t("empty")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {vendors.map((v) =>
            editing === v.id ? (
              <li key={v.id} className="md:col-span-2">
                <Card className="border-vranec/30 p-5">
                  <VendorForm vendor={v} onDone={() => setEditing(null)} />
                </Card>
              </li>
            ) : (
              <li key={v.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{v.name}</p>
                      <p className="text-sm text-stone">{[v.kind, v.contact].filter(Boolean).join(" · ")}</p>
                    </div>
                    {editable ? (
                      <select
                        aria-label={t("status")}
                        value={v.status}
                        onChange={(e) => start(async () => void (await setPlannedVendorStatusAction(v.id, e.target.value as VendorRow["status"])))}
                        className={`h-8 rounded-full border px-2.5 text-xs font-medium ${v.status === "BOOKED" ? "border-olive/30 bg-olive-soft text-olive" : "border-amber/30 bg-amber-soft text-amber"}`}
                      >
                        {PLANNED_VENDOR_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`statuses.${s}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge tone={v.status === "BOOKED" ? "success" : "warning"}>{t(`statuses.${v.status}`)}</Badge>
                    )}
                  </div>
                  {v.notes && <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{v.notes}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm">
                    {v.slug && (
                      <Link href={`/v/${v.slug}`} className="inline-flex items-center gap-1 text-vranec hover:underline">
                        {t("openProfile")} <ExternalLink aria-hidden className="size-3.5" />
                      </Link>
                    )}
                    {v.inBudget && <span className="text-stone">{t("inBudget", { amount: v.inBudget })}</span>}
                    {editable && (
                      <span className="ml-auto flex">
                        <Button variant="ghost" size="sm" aria-label={`${t("edit")}: ${v.name}`} onClick={() => setEditing(v.id)}>
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${t("delete")}: ${v.name}`}
                          onClick={() => {
                            if (confirm(t("confirmDelete", { name: v.name }))) start(async () => void (await deletePlannedVendorAction(v.id)));
                          }}
                        >
                          <Trash2 aria-hidden className="size-4 text-danger" />
                        </Button>
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function VendorForm({ vendor, onDone }: { vendor: VendorRow | null; onDone: () => void }) {
  const t = useTranslations("plan.vendors");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(savePlannedVendorAction.bind(null, vendor?.id ?? null), {} as FormState);
  const fe = state.fieldErrors ?? {};
  const p = vendor?.id ?? "new-vendor";
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-name`} label={t("name")} error={fe.name && te(fe.name)}>
          <Input id={`${p}-name`} name="name" defaultValue={vendor?.name} autoFocus />
        </Field>
        <Field id={`${p}-kind`} label={t("kind")}>
          <Input id={`${p}-kind`} name="kind" defaultValue={vendor?.kind ?? ""} placeholder={t("kindPlaceholder")} />
        </Field>
        <Field id={`${p}-contact`} label={t("contact")}>
          <Input id={`${p}-contact`} name="contact" defaultValue={vendor?.contact ?? ""} />
        </Field>
        <Field id={`${p}-status`} label={t("status")}>
          <Select id={`${p}-status`} name="status" defaultValue={vendor?.status ?? "CONSIDERING"}>
            {PLANNED_VENDOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id={`${p}-notes`} label={t("notes")}>
        <textarea
          id={`${p}-notes`}
          name="notes"
          rows={3}
          defaultValue={vendor?.notes ?? ""}
          className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
