"use client";

import { HEAD_TABLE_ROLES, PLAN_HEIGHT, PLAN_WIDTH, TABLE_SHAPES, type GuestRole, type TableShape } from "@svadba/shared";
import { Crown, Pencil, Plus, RotateCw, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteTableAction,
  headTableAction,
  moveTableAction,
  saveTableAction,
  seatGuestsAction,
  unseatGuestAction,
} from "@/actions/plan-seating";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

export type SeatGuest = {
  id: string;
  name: string;
  household: string;
  householdId: string;
  child: boolean;
  role: GuestRole | null;
};
export type TableRow = {
  id: string;
  name: string;
  shape: TableShape;
  seats: number;
  x: number;
  y: number;
  rotation: number;
  guestIds: string[];
};

/** Chair diameter and the gap between chairs / chair and table, in plan units. */
const CHAIR = 28;
const GAP = 3;

/** Table footprint on the floor plan, in plan units. Grows so `chairs` chairs fit around it. */
function tableSize(shape: TableShape, chairs: number) {
  const pitch = CHAIR + GAP + 1;
  if (shape === "ROUND") {
    const fit = (chairs * pitch) / Math.PI - CHAIR - 2 * GAP; // diameter whose chair ring holds every chair
    const d = Math.max(Math.min(150, 56 + chairs * 5), fit);
    return { w: d, h: d };
  }
  if (shape === "HEAD") return { w: Math.max(Math.min(420, 70 + chairs * 22), chairs * pitch + 12), h: 46 };
  return { w: Math.max(Math.min(420, 40 + chairs * 13), Math.ceil(chairs / 2) * pitch + 12), h: 52 };
}

/**
 * Chair centres relative to the table's top-left corner (before rotation).
 * Round: a ring starting at the top. Long: both long sides. Head: one side only, behind the table,
 * so the couple faces the room (rotate the table to flip it).
 */
function chairSpots(shape: TableShape, chairs: number, w: number, h: number) {
  const out = CHAIR / 2 + GAP;
  if (shape === "ROUND") {
    const r = w / 2 + out;
    return Array.from({ length: chairs }, (_, i) => {
      const a = (i / chairs) * 2 * Math.PI - Math.PI / 2;
      return { x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) };
    });
  }
  const row = (n: number, y: number) => Array.from({ length: n }, (_, i) => ({ x: ((i + 0.5) * w) / n, y }));
  if (shape === "HEAD") return row(chairs, -out);
  const top = Math.ceil(chairs / 2);
  return [...row(top, -out), ...row(chairs - top, h + out)];
}

/** Table fill meter: green when empty, orange half full, red when full. */
const FILL_STOPS = [
  [91, 122, 63], // green
  [197, 138, 43], // orange
  [161, 42, 42], // red (danger)
] as const;
function fillColor(seated: number, seats: number) {
  const t = Math.min(1, seats > 0 ? seated / seats : 1) * (FILL_STOPS.length - 1);
  const i = Math.min(FILL_STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const [a, b] = [FILL_STOPS[i]!, FILL_STOPS[i + 1]!];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k]! - v) * f)).join(" ")})`;
}

/** "Денка Марковска" → "ДМ", "Конте" → "К". */
function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]!, words.at(-1)!] : words;
  return letters.map((w) => w[0]!.toUpperCase()).join("");
}

export function SeatingPlanner({
  eventId,
  locale,
  tables: rawTables,
  guests,
  editable,
}: {
  eventId: string;
  locale: string;
  tables: TableRow[];
  guests: SeatGuest[];
  editable: boolean;
}) {
  const t = useTranslations("plan.seating");
  const tg = useTranslations("plan.guests");
  const [selectedId, setSelectedId] = useState<string | null>(rawTables[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [editingTable, setEditingTable] = useState(false);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number; rotation: number }>>({});
  const [pending, start] = useTransition();
  const byId = new Map(guests.map((g) => [g.id, g]));
  // Head tables list the wedding party in its fixed order, couple in the middle (decision 102).
  const headIndex = (id: string) => {
    const i = (HEAD_TABLE_ROLES as readonly (GuestRole | null)[]).indexOf(byId.get(id)?.role ?? null);
    return i === -1 ? HEAD_TABLE_ROLES.length : i;
  };
  const tables = rawTables.map((tb) =>
    tb.shape === "HEAD" ? { ...tb, guestIds: [...tb.guestIds].sort((a, b) => headIndex(a) - headIndex(b)) } : tb,
  );
  const selected = tables.find((tb) => tb.id === selectedId) ?? null;
  const seated = new Set(tables.flatMap((tb) => tb.guestIds));
  const unseated = guests.filter((g) => !seated.has(g.id));
  const households = groupBy(unseated, (g) => g.householdId);

  const pos = (tb: TableRow) => moved[tb.id] ?? { x: tb.x, y: tb.y, rotation: tb.rotation };
  const seat = (ids: string[]) => selected && start(async () => void (await seatGuestsAction(selected.id, ids)));

  return (
    <div className="space-y-5">
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-sm text-stone lg:block">{t("dragHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              title={t("headTableHint")}
              disabled={pending}
              onClick={() => start(async () => void (await headTableAction(eventId, locale)))}
            >
              <Crown aria-hidden className="size-4" /> {t("headTable")}
            </Button>
            {!adding && (
              <Button onClick={() => setAdding(true)}>
                <Plus aria-hidden className="size-4" /> {t("addTable")}
              </Button>
            )}
          </div>
        </div>
      )}
      {adding && (
        <Card className="border-vranec/30 p-5">
          <TableForm eventId={eventId} table={null} onDone={() => setAdding(false)} />
        </Card>
      )}

      {tables.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{t("noTables")}</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            {/* Floor plan: tablet/desktop only (decision 68). */}
            <FloorPlan
              tables={tables}
              pos={pos}
              selectedId={selectedId}
              editable={editable}
              onSelect={setSelectedId}
              onMove={(id, p) => {
                setMoved((m) => ({ ...m, [id]: p }));
                start(async () => void (await moveTableAction(id, p.x, p.y, p.rotation)));
              }}
              occupancy={(tb) => tb.guestIds.length}
              nameOf={(id) => byId.get(id)?.name}
            />
            {/* List: phones */}
            <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {tables.map((tb) => (
                <li key={tb.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(tb.id)}
                    className={cn(
                      "w-full rounded-xl border bg-surface p-4 text-left transition-colors",
                      selectedId === tb.id ? "border-vranec ring-2 ring-vranec/20" : "border-line",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{tb.name}</span>
                      <Occupancy seated={tb.guestIds.length} seats={tb.seats} />
                    </span>
                    <span className="mt-1 block text-sm text-stone">{tb.guestIds.map((id) => byId.get(id)?.name).filter(Boolean).join(", ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            {selected && (
              <Card className="p-4">
                {editingTable ? (
                  <TableForm eventId={eventId} table={selected} onDone={() => setEditingTable(false)} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">{selected.name}</h2>
                        <p className="text-sm text-stone">
                          {t(`shapes.${selected.shape}`)} · <Occupancy seated={selected.guestIds.length} seats={selected.seats} />
                        </p>
                      </div>
                      {editable && (
                        <div className="flex">
                          <span className="hidden lg:contents">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("rotate")}
                            onClick={() => {
                              const p = pos(selected);
                              const next = { ...p, rotation: (p.rotation + (selected.shape === "ROUND" ? 0 : 90)) % 360 };
                              setMoved((m) => ({ ...m, [selected.id]: next }));
                              start(async () => void (await moveTableAction(selected.id, next.x, next.y, next.rotation)));
                            }}
                          >
                            <RotateCw aria-hidden className="size-4" />
                          </Button>
                          </span>
                          <Button variant="ghost" size="sm" aria-label={t("editTable")} onClick={() => setEditingTable(true)}>
                            <Pencil aria-hidden className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("deleteTable")}
                            onClick={() => {
                              if (confirm(t("confirmDeleteTable", { name: selected.name }))) {
                                start(async () => void (await deleteTableAction(selected.id)));
                                setSelectedId(null);
                              }
                            }}
                          >
                            <Trash2 aria-hidden className="size-4 text-danger" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 text-sm font-medium">{t("guestsAtTable")}</h3>
                    {selected.guestIds.length === 0 ? (
                      <p className="mt-1 text-sm text-stone">{t("emptyTable")}</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-line">
                        {selected.guestIds.map((id) => {
                          const g = byId.get(id);
                          if (!g) return null;
                          return (
                            <li key={id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                              <span>
                                {g.name} <span className="text-stone">· {g.role ? tg(`roles.${g.role}`) : g.household}</span>
                              </span>
                              {editable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`${t("unseat")}: ${g.name}`}
                                  disabled={pending}
                                  onClick={() => start(async () => void (await unseatGuestAction(id, eventId)))}
                                >
                                  <UserMinus aria-hidden className="size-4" />
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </Card>
            )}

            <Card className="p-4">
              <h2 className="font-medium">{t("unseated", { count: unseated.length })}</h2>
              <p className="mt-1 text-sm text-stone">
                {unseated.length === 0 ? t("unseatedEmpty") : selected ? t("selected", { name: selected.name }) : t("selectTable")}
              </p>
              {unseated.length > 0 && (
                <ul className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {[...households.entries()].map(([hid, members]) => (
                    <li key={hid} className="rounded-lg border border-line p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{members[0]!.household}</span>
                        {editable && members.length > 1 && (
                          <Button variant="ghost" size="sm" disabled={!selected || pending} onClick={() => seat(members.map((m) => m.id))}>
                            <Users aria-hidden className="size-4" /> {t("seatFamily")}
                          </Button>
                        )}
                      </div>
                      <ul className="mt-1">
                        {members.map((g) => (
                          <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-ink-soft">{g.name}</span>
                            {editable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!selected || pending}
                                aria-label={`${t("seat")}: ${g.name}`}
                                onClick={() => seat([g.id])}
                              >
                                <UserPlus aria-hidden className="size-4" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Occupancy({ seated, seats }: { seated: number; seats: number }) {
  const t = useTranslations("plan.seating");
  const over = seated > seats;
  return (
    <span className={cn("tabular-nums", over ? "font-semibold text-danger" : "text-stone")} title={over ? t("overCapacity") : undefined}>
      {t("occupancy", { seated, seats })}
    </span>
  );
}

function FloorPlan({
  tables,
  pos,
  selectedId,
  editable,
  onSelect,
  onMove,
  occupancy,
  nameOf,
}: {
  tables: TableRow[];
  pos: (tb: TableRow) => { x: number; y: number; rotation: number };
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, p: { x: number; y: number; rotation: number }) => void;
  occupancy: (tb: TableRow) => number;
  nameOf: (guestId: string) => string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);

  const toPlan = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(PLAN_WIDTH, Math.max(0, ((clientX - r.left) / r.width) * PLAN_WIDTH)),
      y: Math.min(PLAN_HEIGHT, Math.max(0, ((clientY - r.top) / r.height) * PLAN_HEIGHT)),
    };
  };

  return (
    <div
      ref={ref}
      className="@container relative hidden w-full select-none overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface lg:block"
      style={{
        aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}`,
        backgroundImage: "radial-gradient(circle, rgb(35 26 29 / 0.09) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {tables.map((tb) => {
        const p = drag?.id === tb.id ? { ...pos(tb), x: drag.x, y: drag.y } : pos(tb);
        const seated = occupancy(tb);
        const chairs = Math.max(tb.seats, seated);
        const size = tableSize(tb.shape, chairs);
        const over = seated > tb.seats;
        const color = fillColor(seated, tb.seats);
        return (
          <button
            key={tb.id}
            type="button"
            onPointerDown={(e) => {
              onSelect(tb.id);
              if (!editable) return;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Synthetic or already-released pointers can't be captured; dragging still works without it.
              }
              setDrag({ id: tb.id, x: p.x, y: p.y, startX: e.clientX, startY: e.clientY, moved: false });
            }}
            onPointerMove={(e) => {
              if (!drag || drag.id !== tb.id) return;
              const moved = drag.moved || Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4;
              setDrag({ ...drag, ...toPlan(e.clientX, e.clientY), moved });
            }}
            onPointerUp={() => {
              if (drag?.id === tb.id && drag.moved) onMove(tb.id, { x: drag.x, y: drag.y, rotation: p.rotation });
              setDrag(null);
            }}
            onKeyDown={(e) => {
              // Arrow keys nudge the table (keyboard alternative to dragging).
              const step = e.shiftKey ? 50 : 10;
              const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
              if (!d || !editable) return;
              e.preventDefault();
              onMove(tb.id, { x: p.x + d[0]!, y: p.y + d[1]!, rotation: p.rotation });
            }}
            aria-pressed={selectedId === tb.id}
            className={cn(
              "absolute flex touch-none flex-col items-center justify-center border-2 text-center shadow-sm transition-shadow",
              editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              tb.shape === "ROUND" ? "rounded-full" : "rounded-lg",
              tb.shape === "HEAD" ? "border-vranec bg-rosehip" : "border-line-strong bg-linen",
              selectedId === tb.id && "z-10 ring-4 ring-vranec/25",
              over && "border-danger",
            )}
            style={{
              left: `${(p.x / PLAN_WIDTH) * 100}%`,
              top: `${(p.y / PLAN_HEIGHT) * 100}%`,
              width: `${(size.w / PLAN_WIDTH) * 100}%`,
              height: `${(size.h / PLAN_HEIGHT) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            }}
          >
            {chairSpots(tb.shape, chairs, size.w, size.h).map((c, i) => {
              const guestId = tb.guestIds[i];
              const name = guestId ? nameOf(guestId) : undefined;
              return (
                <span
                  key={i}
                  aria-hidden
                  title={name}
                  className={cn(
                    "absolute grid place-items-center rounded-full border-[1.5px] font-semibold leading-none text-white",
                    i >= tb.seats && "ring-2 ring-danger ring-offset-1",
                  )}
                  style={{
                    left: `${((c.x - CHAIR / 2) / size.w) * 100}%`,
                    top: `${((c.y - CHAIR / 2) / size.h) * 100}%`,
                    width: `${(CHAIR / size.w) * 100}%`,
                    height: `${(CHAIR / size.h) * 100}%`,
                    borderColor: color,
                    backgroundColor: guestId ? color : "var(--color-surface)",
                    fontSize: `${(CHAIR * 0.48) / 10}cqw`,
                  }}
                >
                  {name && <span style={{ transform: `rotate(${-p.rotation}deg)` }}>{initials(name)}</span>}
                </span>
              );
            })}
            <span className="max-w-full truncate px-1 text-xs font-medium leading-tight" style={{ transform: `rotate(${-p.rotation}deg)` }}>
              {tb.name}
              <span className={cn("block tabular-nums", over ? "text-danger" : "text-stone")}>
                {occupancy(tb)}/{tb.seats}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TableForm({ eventId, table, onDone }: { eventId: string; table: TableRow | null; onDone: () => void }) {
  const t = useTranslations("plan.seating");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveTableAction.bind(null, eventId, table?.id ?? null), {} as FormState);
  const fe = state.fieldErrors ?? {};
  const p = `table-${table?.id ?? "new"}`;
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className={cn("grid gap-3", table ? "" : "sm:grid-cols-3")}>
        <Field id={`${p}-name`} label={t("tableName")} error={fe.name && te(fe.name)}>
          <Input id={`${p}-name`} name="name" defaultValue={table?.name} autoFocus />
        </Field>
        <Field id={`${p}-shape`} label={t("shape")}>
          <Select id={`${p}-shape`} name="shape" defaultValue={table?.shape ?? "LONG"}>
            {TABLE_SHAPES.map((s) => (
              <option key={s} value={s}>
                {t(`shapes.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-seats`} label={t("seats")} error={fe.seats && te(fe.seats)}>
          <Input id={`${p}-seats`} name="seats" type="number" inputMode="numeric" min={1} max={60} defaultValue={table?.seats ?? 12} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}
