"use client";

import { GUEST_ROLES, ROLE_SIDE, type GuestRole, type GuestSide, type Rsvp } from "@svadba/shared";
import { Pencil, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { quickAddGuestAction, renameGuestAction, setRsvpAction } from "@/actions/plan-guests";
import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";
import type { GuestRow, HouseholdRow } from "./guest-manager";

/** The error to show for a failed quick edit ("emailTaken" never happens here and isn't in the errors namespace). */
function errorKey(res: FormState) {
  const key = res.fieldErrors?.name ?? res.formError;
  return key && key !== "emailTaken" ? key : "generic";
}

type EventOption = { id: string; name: string };
type Column = "BRIDE" | "GROOM" | "BOTH";
export type GuestView = "sides" | "families";

const nextRsvp: Record<Rsvp, Rsvp> = { PENDING: "YES", YES: "NO", NO: "PENDING" };
const rsvpTone: Record<Rsvp, string> = { PENDING: "text-stone/50", YES: "text-olive", NO: "text-danger" };

const VIEW_KEY = "svadba.guestView";
const viewListeners = new Set<() => void>();
function readView(): GuestView {
  try {
    return localStorage.getItem(VIEW_KEY) === "families" ? "families" : "sides";
  } catch {
    return "sides";
  }
}

/** The guest list view, remembered per browser (decision 114). The server always renders "sides". */
export function useGuestView(): [GuestView, (v: GuestView) => void] {
  const view = useSyncExternalStore(
    (cb) => {
      viewListeners.add(cb);
      return () => viewListeners.delete(cb);
    },
    readView,
    () => "sides" as const,
  );
  const set = (v: GuestView) => {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
    viewListeners.forEach((cb) => cb());
  };
  return [view, set];
}

/** "Two sides | Families" switch above the guest list (decision 114). */
export function GuestViewToggle({ view, onChange }: { view: GuestView; onChange: (v: GuestView) => void }) {
  const t = useTranslations("plan.guests.views");
  return (
    <div role="group" aria-label={t("label")} className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5 text-sm">
      {(["sides", "families"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            view === v ? "bg-rosehip text-vranec-deep" : "text-ink-soft hover:text-ink",
          )}
        >
          {t(v)}
        </button>
      ))}
    </div>
  );
}

/**
 * Two sides view (decisions 115-118): bride's and groom's columns, each starting with its wedding-party roles,
 * then families. "Both" families sit in a section below. On phones the three are tabs.
 * `visible` is the set of guest ids that pass the filters, or null when no filter is on.
 */
export function GuestSides({
  households,
  events,
  eventId,
  visible,
  editable,
  onEditFamily,
}: {
  households: HouseholdRow[];
  events: EventOption[];
  eventId: string;
  visible: Set<string> | null;
  editable: boolean;
  onEditFamily: (householdId: string) => void;
}) {
  const t = useTranslations("plan.guests.split");
  const [tab, setTab] = useState<Column>("BRIDE");
  const [answers, setAnswers] = useState<Record<string, Rsvp>>({});
  const [, start] = useTransition();
  const tRoles = useTranslations("plan.guests.roles");
  const tRole = (r: GuestRole) => tRoles(r);

  const shown = (g: GuestRow) => !visible || visible.has(g.id);
  // Oldest first, so a guest added at the bottom of a column shows up there.
  const ordered = [...households].reverse();
  const holders = new Map<GuestRole, GuestRow>();
  for (const h of ordered) for (const g of h.guests) if (g.role) holders.set(g.role, g);

  function columnData(side: Column) {
    const roles =
      side === "BOTH"
        ? []
        : GUEST_ROLES.filter((r) => ROLE_SIDE[r] === side).flatMap((role) => {
            const guest = holders.get(role) ?? null;
            if (guest ? !shown(guest) : visible || !editable) return [];
            return [{ role, guest }];
          });
    const families = ordered
      .filter((h) => h.side === side)
      .map((h) => ({ household: h, guests: h.guests.filter((g) => !g.role && shown(g)) }))
      .filter((f) => f.guests.length > 0);
    const count = roles.filter((r) => r.guest).length + families.reduce((n, f) => n + f.guests.length, 0);
    return { roles, families, count };
  }
  const columns = { BRIDE: columnData("BRIDE"), GROOM: columnData("GROOM"), BOTH: columnData("BOTH") };
  const hasBoth = columns.BOTH.families.length > 0;

  function cycle(guestId: string, evId: string, current: Rsvp) {
    const next = nextRsvp[current];
    setAnswers((a) => ({ ...a, [`${guestId}:${evId}`]: next }));
    start(async () => void (await setRsvpAction(guestId, evId, next)));
  }

  const rowProps = { events, eventId, editable, answers, onCycle: cycle };

  function renderColumn(side: Column) {
    const { roles, families, count } = columns[side];
    return (
      <section aria-labelledby={`col-${side}`} className="min-w-0 px-1 sm:px-6">
        <header className="mb-4 text-center">
          <h2 id={`col-${side}`} className="font-display text-xl text-ink">
            {t(side)}
          </h2>
          <p className="text-sm tabular-nums text-stone">{t("count", { count })}</p>
        </header>
        <ul>
          {roles.map(({ role, guest }) =>
            guest ? (
              <GuestLine key={role} guest={guest} label={tRole(role)} {...rowProps} />
            ) : (
              <EmptyRoleLine key={role} role={role} label={tRole(role)} />
            ),
          )}
          {families.map(({ household: h, guests }) =>
            guests.map((g, i) => (
              <GuestLine
                key={g.id}
                guest={g}
                label={i === 0 && !(guests.length === 1 && h.guests.length === 1 && h.name === g.name) ? h.name : null}
                onEditFamily={i === 0 && editable ? () => onEditFamily(h.id) : undefined}
                {...rowProps}
              />
            )),
          )}
        </ul>
        {editable && !visible && <AddGuestLine side={side} />}
      </section>
    );
  }

  const tabs: Column[] = ["BRIDE", "GROOM", "BOTH"];

  return (
    <div>
      <div role="tablist" className="mb-4 grid grid-cols-3 rounded-lg border border-line-strong bg-surface p-0.5 text-sm sm:hidden">
        {tabs.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={tab === c}
            onClick={() => setTab(c)}
            className={cn("whitespace-nowrap rounded-md px-1 py-1.5 text-[13px] font-medium", tab === c ? "bg-rosehip text-vranec-deep" : "text-ink-soft")}
          >
            {t(`tabs.${c}`)} <span className="tabular-nums text-stone">{columns[c].count}</span>
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-line-strong">
        <div className={tab === "BRIDE" ? "" : "hidden sm:block"}>{renderColumn("BRIDE")}</div>
        <div className={tab === "GROOM" ? "" : "hidden sm:block"}>{renderColumn("GROOM")}</div>
      </div>
      <div
        className={cn(
          "sm:mt-8 sm:border-t sm:border-line-strong sm:pt-6",
          tab === "BOTH" ? (hasBoth ? "" : "sm:hidden") : hasBoth ? "hidden sm:block" : "hidden",
        )}
      >
        <div className="sm:mx-auto sm:max-w-xl">{renderColumn("BOTH")}</div>
      </div>
    </div>
  );
}

/** One guest row: small label above, the name (editable in place), and the answer icon on the right. */
function GuestLine({
  guest: g,
  label,
  events,
  eventId,
  editable,
  answers,
  onCycle,
  onEditFamily,
}: {
  guest: GuestRow;
  label: string | null;
  events: EventOption[];
  eventId: string;
  editable: boolean;
  answers: Record<string, Rsvp>;
  onCycle: (guestId: string, eventId: string, current: Rsvp) => void;
  onEditFamily?: () => void;
}) {
  const t = useTranslations("plan.guests");
  const ts = useTranslations("plan.guests.split");
  const te = useTranslations("errors");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const saved = useRef(g.name);

  const invites = g.invitations
    .filter((i) => !eventId || i.eventId === eventId)
    .map((i) => ({ ...i, rsvp: answers[`${g.id}:${i.eventId}`] ?? i.rsvp }));
  const overall: Rsvp | null = !invites.length
    ? null
    : invites.some((i) => i.rsvp === "YES")
      ? "YES"
      : invites.every((i) => i.rsvp === "NO")
        ? "NO"
        : "PENDING";
  const single = invites.length === 1 ? invites[0] : null;
  const canCycle = editable && !!single;
  const tip = !invites.length
    ? ts("notInvited")
    : [
        ...invites.map((i) => {
          const answer = t(`rsvp.${i.rsvp}`);
          return events.length > 1 ? `${events.find((e) => e.id === i.eventId)?.name ?? ""}: ${answer}` : answer;
        }),
        canCycle ? ts("answerHint") : editable ? ts("pickEvent") : null,
      ]
        .filter(Boolean)
        .join("\n");

  function save() {
    const el = input.current;
    if (!el) return;
    const name = el.value.trim();
    if (name === saved.current) return setError(null);
    const before = saved.current;
    saved.current = name;
    start(async () => {
      const res = await renameGuestAction(g.id, name);
      if (!res.ok) saved.current = before;
      setError(res.ok ? null : te(errorKey(res)));
    });
  }

  const child = g.ageGroup === "CHILD";
  const icon = (
    <User
      aria-hidden
      fill="currentColor"
      strokeWidth={1.5}
      className={cn(child ? "size-4" : "size-5", overall ? rsvpTone[overall] : "text-line-strong")}
    />
  );

  return (
    <li className="border-b border-line py-2">
      {label && (
        <div className="flex items-center gap-1 text-xs text-stone">
          <span className="truncate">{label}</span>
          {onEditFamily && (
            <button
              type="button"
              onClick={onEditFamily}
              aria-label={ts("editFamily", { name: label })}
              className="rounded p-0.5 text-stone hover:text-vranec"
            >
              <Pencil aria-hidden className="size-3" />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {editable ? (
          <input
            key={g.name}
            ref={input}
            defaultValue={g.name}
            aria-label={ts("rename", { name: g.name })}
            aria-invalid={!!error}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = g.name;
                setError(null);
                e.currentTarget.blur();
              }
            }}
            className={cn(
              "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 -mx-1 text-[15px] text-ink hover:border-line focus:border-line-strong focus:bg-surface focus:outline-none",
              child && "text-sm",
              error && "border-danger/50",
            )}
          />
        ) : (
          <span className={cn("min-w-0 flex-1 truncate py-1 text-[15px]", child && "text-sm")}>{g.name}</span>
        )}
        {child && <span className="text-xs text-stone">{ts("child")}</span>}
        {!label && onEditFamily && (
          <button
            type="button"
            onClick={onEditFamily}
            aria-label={ts("editFamily", { name: g.name })}
            className="rounded p-1 text-line-strong hover:text-vranec"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        )}
        {canCycle ? (
          <button
            type="button"
            title={tip}
            aria-label={`${g.name}: ${t(`rsvp.${single.rsvp}`)}`}
            onClick={() => onCycle(g.id, single.eventId, single.rsvp)}
            className="grid size-8 place-items-center rounded-md hover:bg-rosehip"
          >
            {icon}
          </button>
        ) : (
          <span title={tip} className="grid size-8 place-items-center">
            {icon}
            <span className="sr-only">{tip}</span>
          </span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </li>
  );
}

/** A wedding-party role nobody holds yet: typing a name creates that guest (decision 116). */
function EmptyRoleLine({ role, label }: { role: GuestRole; label: string }) {
  const ts = useTranslations("plan.guests.split");
  return (
    <li className="border-b border-line py-2">
      <div className="text-xs text-stone">{label}</div>
      <QuickInput side={ROLE_SIDE[role]} role={role} placeholder={ts("namePlaceholder")} ariaLabel={label} faint />
    </li>
  );
}

/** "+ Add guest" at the bottom of a column: a new family on that side from one name. */
function AddGuestLine({ side }: { side: GuestSide }) {
  const ts = useTranslations("plan.guests.split");
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="border-b border-line py-2">
      <QuickInput
        side={side}
        role={null}
        placeholder={ts("newName")}
        ariaLabel={ts("newName")}
        autoFocus
        keepOpen
        onClose={() => setOpen(false)}
      />
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1 py-1.5 text-sm font-medium text-vranec hover:text-vranec-deep"
    >
      <Plus aria-hidden className="size-4" /> {ts("addGuest")}
    </button>
  );
}

function QuickInput({
  side,
  role,
  placeholder,
  ariaLabel,
  autoFocus,
  keepOpen,
  faint,
  onClose,
}: {
  side: GuestSide;
  role: GuestRole | null;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  keepOpen?: boolean;
  faint?: boolean;
  onClose?: () => void;
}) {
  const te = useTranslations("errors");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const cancelled = useRef(false);

  function submit(close: boolean) {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const name = value.trim();
    if (!name) {
      setError(null);
      if (close) onClose?.();
      return;
    }
    // Clear at once so the next name can be typed while this one saves.
    setValue("");
    start(async () => {
      const res = await quickAddGuestAction({ name, side, role });
      if (res.ok) {
        setError(null);
        if (close || !keepOpen) onClose?.();
      } else {
        setValue(name);
        setError(te(errorKey(res)));
      }
    });
  }

  return (
    <>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        autoFocus={autoFocus}
        onBlur={() => submit(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(false);
          }
          if (e.key === "Escape") {
            cancelled.current = true;
            setValue("");
            setError(null);
            e.currentTarget.blur();
            onClose?.();
          }
        }}
        className={cn(
          "-mx-1 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[15px] text-ink hover:border-line focus:border-line-strong focus:bg-surface focus:outline-none",
          faint ? "placeholder:text-line-strong" : "placeholder:text-stone/60",
          error && "border-danger/50",
        )}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </>
  );
}
