"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {useEffect, useRef, useState, useTransition} from "react";
import { deleteReferenceAction, saveReferenceAction, type ReferenceKind } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, inputClass } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

export type ReferenceRow = {
  id: string;
  slug?: string;
  nameMk: string;
  nameSq: string;
  nameEn: string;
  region?: string | null;
  active: boolean;
};

type Config = { kind: ReferenceKind; hasSlug: boolean; hasRegion: boolean; canDelete: boolean };

/** Editable list of translated reference rows (cities, venue features, vendor categories). */
export function ReferenceEditor({
  rows,
  config,
  addLabel,
}: {
  rows: ReferenceRow[];
  config: Config;
  addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {addLabel && (
        <div className="flex justify-end">
          {!adding && (
            <Button onClick={() => setAdding(true)} size="sm">
              <Plus aria-hidden className="size-4" /> {addLabel}
            </Button>
          )}
        </div>
      )}
      {adding && (
        <Card className="border-vranec/30 p-4">
          <RowForm config={config} row={null} onDone={() => setAdding(false)} />
        </Card>
      )}
      <Card className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.id} className="p-4">
            <RowForm config={config} row={row} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function RowForm({ config, row, onDone }: { config: Config; row: ReferenceRow | null; onDone?: () => void }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, action, pending] = useFormAction(
    saveReferenceAction.bind(null, config.kind, row?.id ?? null),
    {} as FormState,
  );
  const [deleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};
  const idp = row?.id ?? "new";

  useEffect(() => {
    if (state.ok && !row) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, row, onDone]);

  const input = (name: "slug" | "nameMk" | "nameSq" | "nameEn" | "region", label: string, value?: string | null) => (
    <div className="min-w-0">
      <label htmlFor={`${idp}-${name}`} className="mb-1 block text-xs font-medium text-stone">
        {label}
      </label>
      <input
        id={`${idp}-${name}`}
        name={name}
        defaultValue={value ?? ""}
        aria-invalid={!!fe[name]}
        className={cn(inputClass, "h-9 text-sm")}
        lang={name === "nameMk" ? "mk" : name === "nameSq" ? "sq" : undefined}
      />
      {fe[name] && <p className="mt-1 text-xs text-danger">{te(fe[name])}</p>}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={action} className="flex flex-col gap-3 xl:flex-row xl:items-end">
      <div
        className={cn(
          "grid flex-1 gap-3 sm:grid-cols-2",
          config.hasSlug && config.hasRegion ? "xl:grid-cols-5" : config.hasSlug ? "xl:grid-cols-4" : "xl:grid-cols-3",
        )}
      >
        {config.hasSlug && input("slug", t("fields.slug"), row?.slug)}
        {input("nameMk", t("fields.nameMk"), row?.nameMk)}
        {input("nameSq", t("fields.nameSq"), row?.nameSq)}
        {input("nameEn", t("fields.nameEn"), row?.nameEn)}
        {config.hasRegion && input("region", t("fields.region"), row?.region)}
      </div>
      <div className="flex items-center gap-3 xl:h-9">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <Checkbox name="active" defaultChecked={row?.active ?? true} />
          {t("fields.active")}
        </label>
        <Button type="submit" size="sm" variant={row ? "secondary" : "primary"} disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        {row && config.canDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`${tc("delete")} ${row.nameEn}`}
            disabled={deleting}
            onClick={() => {
              if (confirm(t("confirmDelete", { name: row.nameMk }))) {
                startDelete(async () => {
                  await deleteReferenceAction(config.kind, row.id);
                });
              }
            }}
          >
            <Trash2 aria-hidden className="size-4 text-danger" />
          </Button>
        )}
        {!row && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
        )}
        <span role="status" className="text-xs text-olive">
          {state.ok && row ? t("saved") : ""}
          {state.formError && state.formError !== "emailTaken" && <span className="text-danger">{te(state.formError)}</span>}
        </span>
      </div>
    </form>
  );
}
