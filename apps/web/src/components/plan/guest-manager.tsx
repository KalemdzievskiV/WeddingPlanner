"use client";

import { AGE_GROUPS, GUEST_ROLES, GUEST_SIDES, type AgeGroup, type GuestRole, type GuestSide, type Rsvp } from "@svadba/shared";
import { Check, Link2, MessageCircle, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { deleteAllGuestsAction, deleteHouseholdAction, saveHouseholdAction, setRsvpAction } from "@/actions/plan-guests";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, inputClass, Select } from "@/components/ui/field";
import type { ErrorKey } from "@/lib/form";
import { cn } from "@/lib/utils";
import { GuestImport } from "./guest-import";
import { InvitationCard } from "./invitation-card";

export type GuestRow = {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  role: GuestRole | null;
  invitations: { eventId: string; rsvp: Rsvp }[];
};
export type HouseholdRow = {
  id: string;
  name: string;
  side: GuestSide;
  notes: string | null;
  guestNote: string | null;
  respondedAt: string | null;
  rsvpToken: string;
  guests: GuestRow[];
};
type EventOption = { id: string; name: string };

const rsvpStyle: Record<Rsvp, string> = {
  PENDING: "border-line-strong bg-surface text-stone",
  YES: "border-olive/30 bg-olive-soft text-olive",
  NO: "border-danger/25 bg-danger-soft text-danger",
};
const nextRsvp: Record<Rsvp, Rsvp> = { PENDING: "YES", YES: "NO", NO: "PENDING" };

export function GuestManager({
  households,
  events,
  editable,
  rsvpBase,
  couple,
  invitationUrl,
}: {
  households: HouseholdRow[];
  events: EventOption[];
  editable: boolean;
  rsvpBase: string;
  couple: string;
  invitationUrl: string | null;
}) {
  const t = useTranslations("plan.guests");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"" | GuestSide>("");
  const [eventId, setEventId] = useState("");
  const [rsvp, setRsvp] = useState<"" | Rsvp>("");
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return households.filter((h) => {
      if (side && h.side !== side) return false;
      if (q && !h.name.toLowerCase().includes(q) && !h.guests.some((g) => g.name.toLowerCase().includes(q))) return false;
      if (eventId || rsvp) {
        return h.guests.some((g) =>
          g.invitations.some((i) => (!eventId || i.eventId === eventId) && (!rsvp || i.rsvp === rsvp)),
        );
      }
      return true;
    });
  }, [households, query, side, eventId, rsvp]);

  const guestCount = filtered.reduce((n, h) => n + h.guests.length, 0);
  const children = filtered.reduce((n, h) => n + h.guests.filter((g) => g.ageGroup === "CHILD").length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tabular-nums">{t("counts", { households: filtered.length, guests: guestCount })}</p>
          <p className="text-sm text-stone">{t("ages", { adults: guestCount - children, children })}</p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            {households.length > 0 && <DeleteAllButton households={households} />}
            <Button variant="secondary" onClick={() => setImporting((v) => !v)}>
              <Upload aria-hidden className="size-4" /> {t("import")}
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" /> {t("add")}
            </Button>
          </div>
        )}
      </div>

      <InvitationCard url={invitationUrl} editable={editable} />

      {importing && <GuestImport events={events} onClose={() => setImporting(false)} />}
      {editing === "new" && (
        <HouseholdEditor household={null} events={events} onDone={() => setEditing(null)} />
      )}

      {households.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <Select aria-label={t("filterSide")} value={side} onChange={(e) => setSide(e.target.value as GuestSide | "")}>
            <option value="">{t("filterSide")}: {t("all")}</option>
            {GUEST_SIDES.map((s) => (
              <option key={s} value={s}>
                {t(`sides.${s}`)}
              </option>
            ))}
          </Select>
          {events.length > 1 && (
            <Select aria-label={t("filterEvent")} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">{t("filterEvent")}: {t("all")}</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          )}
          <Select aria-label={t("filterRsvp")} value={rsvp} onChange={(e) => setRsvp(e.target.value as Rsvp | "")}>
            <option value="">{t("filterRsvp")}: {t("all")}</option>
            {(["PENDING", "YES", "NO"] as const).map((r) => (
              <option key={r} value={r}>
                {t(`rsvp.${r}`)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {households.length === 0 && editing !== "new" ? (
        <Card className="p-10 text-center text-ink-soft">{t("empty")}</Card>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-stone">{t("noMatch")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((h) =>
            editing === h.id ? (
              <li key={h.id}>
                <HouseholdEditor household={h} events={events} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={h.id}>
                <HouseholdCard
                  household={h}
                  events={events}
                  editable={editable}
                  rsvpUrl={`${rsvpBase}/${h.rsvpToken}`}
                  couple={couple}
                  onEdit={() => setEditing(h.id)}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function HouseholdCard({
  household: h,
  events,
  editable,
  rsvpUrl,
  couple,
  onEdit,
}: {
  household: HouseholdRow;
  events: EventOption[];
  editable: boolean;
  rsvpUrl: string;
  couple: string;
  onEdit: () => void;
}) {
  const t = useTranslations("plan.guests");
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(h.guests.flatMap((g) => g.invitations.map((i) => [`${g.id}:${i.eventId}`, i.rsvp]))),
  );
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const share = t("shareText", { couple, url: rsvpUrl });

  function cycle(guestId: string, eventId: string) {
    const key = `${guestId}:${eventId}`;
    const next = nextRsvp[(answers[key] as Rsvp) ?? "PENDING"];
    setAnswers((a) => ({ ...a, [key]: next }));
    start(async () => void (await setRsvpAction(guestId, eventId, next)));
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{h.name}</h3>
            <Badge tone={h.side === "BRIDE" ? "accent" : h.side === "GROOM" ? "warning" : "neutral"}>{t(`sides.${h.side}`)}</Badge>
          </div>
          {h.respondedAt && <p className="mt-0.5 text-xs text-stone">{t("answered", { date: h.respondedAt })}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={async () => {
              await navigator.clipboard.writeText(rsvpUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check aria-hidden className="size-4 text-olive" /> : <Link2 aria-hidden className="size-4" />}
            <span>{t("rsvpLink")}</span>
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(share)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("ghost", "sm")}
          >
            <MessageCircle aria-hidden className="size-4" /> {t("shareWhatsapp")}
          </a>
          <a href={`viber://forward?text=${encodeURIComponent(share)}`} className={buttonClass("ghost", "sm")}>
            {t("shareViber")}
          </a>
          {editable && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`${t("edit")}: ${h.name}`}>
                <Pencil aria-hidden className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`${t("delete")}: ${h.name}`}
                onClick={() => {
                  if (confirm(t("confirmDelete", { name: h.name }))) start(async () => void (await deleteHouseholdAction(h.id)));
                }}
              >
                <Trash2 aria-hidden className="size-4 text-danger" />
              </Button>
            </>
          )}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line border-t border-line">
        {h.guests.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
            <span className="min-w-0 flex-1 text-sm">
              {g.name}
              {g.role && (
                <span className="ml-1.5 rounded-full bg-rosehip px-2 py-0.5 text-xs font-medium text-vranec">{t(`roles.${g.role}`)}</span>
              )}{" "}
              <span className="text-stone">· {t(`ageGroups.${g.ageGroup}`)}</span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              {events.map((e) => {
                const value = answers[`${g.id}:${e.id}`] as Rsvp | undefined;
                if (!value) return null;
                const label = events.length > 1 ? `${e.name}: ${t(`rsvp.${value}`)}` : t(`rsvp.${value}`);
                return editable ? (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => cycle(g.id, e.id)}
                    className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:opacity-80", rsvpStyle[value])}
                  >
                    {label}
                  </button>
                ) : (
                  <span key={e.id} className={cn("rounded-full border px-2.5 py-0.5 text-xs", rsvpStyle[value])}>
                    {label}
                  </span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      {(h.guestNote || h.notes) && (
        <div className="mt-3 space-y-1 text-sm">
          {h.guestNote && (
            <p className="rounded-lg bg-rosehip/60 px-3 py-2 text-ink-soft">
              <span className="font-medium text-ink">{t("guestNote")}: </span>
              {h.guestNote}
            </p>
          )}
          {h.notes && <p className="text-stone">{h.notes}</p>}
        </div>
      )}
    </Card>
  );
}

type DraftGuest = { id?: string; key: string; name: string; ageGroup: AgeGroup; role: GuestRole | null };

function HouseholdEditor({
  household,
  events,
  onDone,
}: {
  household: HouseholdRow | null;
  events: EventOption[];
  onDone: () => void;
}) {
  const t = useTranslations("plan.guests");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [name, setName] = useState(household?.name ?? "");
  const [side, setSide] = useState<GuestSide>(household?.side ?? "BRIDE");
  const [notes, setNotes] = useState(household?.notes ?? "");
  const [guests, setGuests] = useState<DraftGuest[]>(
    household?.guests.map((g) => ({ id: g.id, key: g.id, name: g.name, ageGroup: g.ageGroup, role: g.role })) ?? [
      { key: "g0", name: "", ageGroup: "ADULT", role: null },
    ],
  );
  const [eventIds, setEventIds] = useState<string[]>(() => {
    if (!household) return events.map((e) => e.id);
    const ids = new Set(household.guests.flatMap((g) => g.invitations.map((i) => i.eventId)));
    return events.map((e) => e.id).filter((id) => ids.has(id));
  });
  const [errors, setErrors] = useState<Record<string, ErrorKey>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const idp = household?.id ?? "new";

  const update = (key: string, patch: Partial<DraftGuest>) =>
    setGuests((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      side,
      notes,
      eventIds,
      guests: guests.filter((g) => g.name.trim()).map(({ id, name, ageGroup, role }) => ({ id, name, ageGroup, role })),
    };
    start(async () => {
      const res = await saveHouseholdAction(household?.id ?? null, payload);
      if (res.ok) onDone();
      else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.formError && res.formError !== "emailTaken" ? te(res.formError) : null);
      }
    });
  }

  return (
    <Card className="border-vranec/30 p-5">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <Field id={`${idp}-name`} label={t("familyName")} error={errors.name && te(errors.name)}>
            <Input
              id={`${idp}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("familyPlaceholder")}
              aria-invalid={!!errors.name}
              autoFocus
            />
          </Field>
          <Field id={`${idp}-side`} label={t("side")}>
            <Select id={`${idp}-side`} value={side} onChange={(e) => setSide(e.target.value as GuestSide)}>
              {GUEST_SIDES.map((s) => (
                <option key={s} value={s}>
                  {t(`sides.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("members")}</legend>
          <ul className="space-y-2">
            {guests.map((g, i) => (
              <li key={g.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_8.5rem_9.5rem_auto]">
                <Input
                  aria-label={`${t("memberName")} ${i + 1}`}
                  value={g.name}
                  onChange={(e) => update(g.key, { name: e.target.value })}
                  placeholder={t("memberName")}
                />
                <Select
                  aria-label={t("ageGroup")}
                  value={g.ageGroup}
                  className="col-start-1 sm:col-start-auto"
                  onChange={(e) => update(g.key, { ageGroup: e.target.value as AgeGroup })}
                >
                  {AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>
                      {t(`ageGroups.${a}`)}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={t("role")}
                  value={g.role ?? ""}
                  className="col-start-1 sm:col-start-auto"
                  onChange={(e) => update(g.key, { role: (e.target.value || null) as GuestRole | null })}
                >
                  <option value="">{t("noRole")}</option>
                  {GUEST_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto"
                  aria-label={t("removeMember")}
                  disabled={guests.length === 1}
                  onClick={() => setGuests((gs) => gs.filter((x) => x.key !== g.key))}
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          {errors.guests && <p className="mt-1 text-sm text-danger">{te(errors.guests)}</p>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setGuests((gs) => [...gs, { key: `g${Date.now()}`, name: "", ageGroup: "ADULT", role: null }])}
          >
            <Plus aria-hidden className="size-4" /> {t("addMember")}
          </Button>
        </fieldset>

        {events.length > 1 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("invitedTo")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {events.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={eventIds.includes(e.id)}
                    onChange={(ev) =>
                      setEventIds((ids) => (ev.target.checked ? [...ids, e.id] : ids.filter((x) => x !== e.id)))
                    }
                  />
                  {e.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <Field id={`${idp}-notes`} label={t("notes")}>
          <Input id={`${idp}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {formError && <p className="text-sm text-danger">{formError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? tc("saving") : t("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DeleteAllButton({ households }: { households: HouseholdRow[] }) {
  const t = useTranslations("plan.guests");
  const [pending, start] = useTransition();
  const guests = households.reduce((n, h) => n + h.guests.length, 0);
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm(t("confirmDeleteAll", { households: households.length, guests })))
          start(async () => void (await deleteAllGuestsAction()));
      }}
    >
      <Trash2 aria-hidden className="size-4" /> {t("deleteAll")}
    </Button>
  );
}
