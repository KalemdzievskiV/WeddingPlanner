"use client";

import {
  FLOOR_ITEM_KINDS,
  FLOOR_ITEM_LOOK,
  FLOOR_ITEM_MIN,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  TABLE_SHAPES,
  type FloorItemKind,
  type GuestRole,
  type Rsvp,
  type TableShape,
} from "@svadba/shared";
import {
  Crown,
  EyeOff,
  Eye,
  GripVertical,
  Undo2,
  Wand2,
  Locate,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Shapes,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addFloorItemAction,
  addTableAction,
  deleteFloorItemAction,
  deleteTableAction,
  autoSeatAction,
  headTableAction,
  hideSeatAction,
  moveFloorItemAction,
  placeGuestAction,
  seatingDisplayAction,
  undoAutoSeatAction,
  moveTableAction,
  saveFloorItemAction,
  saveTableAction,
  seatGuestsAction,
  unseatGuestAction,
} from "@/actions/plan-seating";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, inputClass, Select } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import { FloorIcon, hasFloorIcon, QUIET_KINDS } from "./floor-icons";
import { EmptyChair, FigureBadge, FigureShape, SeatName } from "./seat-figure";
import { SeatingListActions, SeatingPrintList } from "./seating-export";

export type SeatGuest = {
  id: string;
  name: string;
  household: string;
  householdId: string;
  child: boolean;
  role: GuestRole | null;
  side: "BRIDE" | "GROOM" | "BOTH";
  rsvp: Rsvp;
};
export type TableRow = {
  id: string;
  name: string;
  shape: TableShape;
  seats: number;
  x: number;
  y: number;
  rotation: number;
  /** Seated guests in chair order (for lists and exports). */
  guestIds: string[];
  /** Who sits on which chair (0-based, decision 133). */
  chairs: { guestId: string; seat: number }[];
  /** Hidden chair numbers. */
  hidden: number[];
};
/** Seating plan look (decision 132). */
export type SeatDisplay = { plain: boolean; firstNames: boolean };
type Seat = { tableId: string; seat: number };
type SeatChange = { type: "place"; guestId: string; tableId: string; seat: number | null } | { type: "unseat"; guestId: string };

/** Chairs a table draws: its seats, or more when guests sit past them (over capacity). */
const chairCount = (tb: TableRow) => Math.max(tb.seats, ...tb.chairs.map((c) => c.seat + 1));
/** Seats that can take a guest (hidden chairs don't count). */
const openSeats = (tb: TableRow) => tb.seats - tb.hidden.filter((h) => h < tb.seats).length;

/** First free chair of a table, like the server's `freeSeats`. */
function firstFree(tb: TableRow, except?: string) {
  const taken = new Set(tb.chairs.filter((c) => c.guestId !== except).map((c) => c.seat));
  for (let i = 0; ; i++) if (!taken.has(i) && !(i < tb.seats && tb.hidden.includes(i))) return i;
}

/** The same move as `placeGuestAction` / `unseatGuestAction`, applied to the tables shown until the server answers. */
function applySeatChange(tables: TableRow[], change: SeatChange): TableRow[] {
  const from = tables.flatMap((tb) => tb.chairs.filter((c) => c.guestId === change.guestId).map((c) => ({ tableId: tb.id, seat: c.seat })))[0];
  let next = tables.map((tb) => ({ ...tb, chairs: tb.chairs.filter((c) => c.guestId !== change.guestId) }));
  if (change.type === "place") {
    const target = next.find((tb) => tb.id === change.tableId);
    if (!target) return tables;
    const seat = change.seat ?? firstFree(target);
    const other = target.chairs.find((c) => c.seat === seat);
    next = next.map((tb) => {
      let chairs = tb.chairs;
      if (other) chairs = chairs.filter((c) => c.guestId !== other.guestId);
      if (other && from && tb.id === from.tableId) chairs = [...chairs, { guestId: other.guestId, seat: from.seat }];
      if (tb.id === change.tableId) chairs = [...chairs, { guestId: change.guestId, seat }];
      return { ...tb, chairs };
    });
  }
  return next.map((tb) => {
    const chairs = [...tb.chairs].sort((a, b) => a.seat - b.seat);
    return { ...tb, chairs, guestIds: chairs.map((c) => c.guestId) };
  });
}

export type FloorItemRow = {
  id: string;
  kind: FloorItemKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
type ItemBox = Pick<FloorItemRow, "x" | "y" | "width" | "height" | "rotation">;

/** Chair diameter and the gap between chairs / chair and table, in plan units. */
const CHAIR = 28;
const GAP = 3;
/** Table label size, in plan units. */
const LABEL = 13;
/** Room element label size, in plan units (bigger than table labels: elements are large and have no chairs). */
const ITEM_LABEL = 20;
/** Floor plan zoom (decision 104): 100% fits the whole plan in the width. */
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

/** Table footprint on the floor plan, in plan units. Grows so `chairs` chairs fit around it. */
function tableSize(shape: TableShape, chairs: number) {
  const pitch = CHAIR + GAP + 1;
  const out = CHAIR / 2 + GAP;
  switch (shape) {
    case "ROUND": {
      const fit = (chairs * pitch) / Math.PI - CHAIR - 2 * GAP; // diameter whose chair ring holds every chair
      const d = Math.max(Math.min(150, 56 + chairs * 5), fit);
      return { w: d, h: d };
    }
    case "HEAD":
      return { w: Math.max(Math.min(420, 70 + chairs * 22), chairs * pitch + 12), h: 46 };
    case "SQUARE": {
      const side = Math.max(72, Math.ceil(chairs / 4) * pitch + 16);
      return { w: side, h: side };
    }
    case "ELLIPSE": {
      // The chair ring (half-axes w/2+out, h/2+out, w = 1.8h) must be long enough for every chair.
      const h = Math.max(60, ((chairs * pitch) / Math.PI - 2 * out) / 1.4);
      return { w: h * 1.8, h };
    }
    case "HALF_ROUND": {
      // Chairs sit along the curved side only.
      const w = Math.max(110, 2 * ((chairs * pitch) / Math.PI - out));
      return { w, h: w / 2 };
    }
    case "ROW":
      return { w: chairs * pitch, h: CHAIR + 4 };
    default:
      return { w: Math.max(Math.min(420, 40 + chairs * 13), Math.ceil(chairs / 2) * pitch + 12), h: 52 };
  }
}

/**
 * Chair centres relative to the table's top-left corner (before rotation).
 * Round / ellipse: a ring starting at the top. Long: both long sides. Square: all four sides.
 * Head: one side only, behind the table, so the couple faces the room (rotate the table to flip it).
 * Half-round: along the curve. Row: the chairs themselves, in a line.
 */
function chairSpots(shape: TableShape, chairs: number, w: number, h: number) {
  const out = CHAIR / 2 + GAP;
  const row = (n: number, y: number) => Array.from({ length: n }, (_, i) => ({ x: ((i + 0.5) * w) / n, y }));
  const col = (n: number, x: number) => Array.from({ length: n }, (_, i) => ({ x, y: ((i + 0.5) * h) / n }));
  if (shape === "ROUND" || shape === "ELLIPSE") {
    const rx = w / 2 + out;
    const ry = h / 2 + out;
    return Array.from({ length: chairs }, (_, i) => {
      const a = (i / chairs) * 2 * Math.PI - Math.PI / 2;
      return { x: w / 2 + rx * Math.cos(a), y: h / 2 + ry * Math.sin(a) };
    });
  }
  if (shape === "HALF_ROUND") {
    const r = w / 2 + out;
    return Array.from({ length: chairs }, (_, i) => {
      const a = ((i + 0.5) / chairs) * Math.PI; // 0..π: right → bottom → left
      return { x: w / 2 + r * Math.cos(a), y: r * Math.sin(a) };
    });
  }
  if (shape === "SQUARE") {
    const per = [0, 1, 2, 3].map((k) => Math.floor(chairs / 4) + (k < chairs % 4 ? 1 : 0));
    return [...row(per[0]!, -out), ...col(per[1]!, w + out), ...row(per[2]!, h + out).reverse(), ...col(per[3]!, -out).reverse()];
  }
  if (shape === "ROW") return row(chairs, h / 2);
  if (shape === "HEAD") return row(chairs, -out);
  const top = Math.ceil(chairs / 2);
  return [...row(top, -out), ...row(chairs - top, h + out)];
}

/**
 * Which way a guest on a chair faces (towards the table), as the figure's turn in degrees, and the opposite
 * direction (`out`, radians, table coordinates) where their name goes. A row of chairs faces up.
 */
function facing(shape: TableShape, c: { x: number; y: number }, w: number, h: number) {
  let dx: number;
  let dy: number;
  if (shape === "ROW") [dx, dy] = [0, -1];
  else if (shape === "ROUND" || shape === "ELLIPSE") [dx, dy] = [w / 2 - c.x, h / 2 - c.y];
  else if (shape === "HALF_ROUND") [dx, dy] = [w / 2 - c.x, 0 - c.y];
  else [dx, dy] = [Math.min(w, Math.max(0, c.x)) - c.x, Math.min(h, Math.max(0, c.y)) - c.y];
  const a = Math.atan2(dy, dx);
  return { deg: (a * 180) / Math.PI + 90, out: a + Math.PI };
}

/** Table outline per shape (the half-round's flat side is at the top). */
const tableShapeClass: Record<TableShape, string> = {
  LONG: "rounded-lg",
  HEAD: "rounded-lg",
  SQUARE: "rounded-lg",
  ROUND: "rounded-full",
  ELLIPSE: "rounded-[50%]",
  HALF_ROUND: "rounded-b-full",
  ROW: "rounded-full border-transparent! bg-transparent! shadow-none!",
};

export function SeatingPlanner({
  eventId,
  locale,
  tables: rawTables,
  items,
  guests,
  editable,
  mode = "page",
  events = [],
  couple = "",
  eventName = "",
  display = { plain: false, firstNames: false },
}: {
  /** Coloured or plain figures, full or first names (decision 132). */
  display?: SeatDisplay;
  /** For the printed and downloaded table list. */
  couple?: string;
  eventName?: string;
  eventId: string;
  locale: string;
  tables: TableRow[];
  items: FloorItemRow[];
  guests: SeatGuest[];
  editable: boolean;
  /** "editor": the full-screen editor (decision 126). */
  mode?: "page" | "editor";
  /** Seating events, for the editor's event switch. */
  events?: { id: string; name: string }[];
}) {
  const t = useTranslations("plan.seating");
  const tg = useTranslations("plan.guests");
  const [picking, setPicking] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  /** The middle of the visible plan, in plan units: new tables and elements go there. */
  const viewCenter = () => {
    const v = viewportRef.current?.getBoundingClientRect();
    const r = planRef.current?.getBoundingClientRect();
    if (!v || !r || !r.width) return { x: PLAN_WIDTH / 2, y: PLAN_HEIGHT / 2 };
    // Keep it well inside the plan, even when the view shows empty space around it.
    const clamp = (n: number, max: number) => Math.min(max - 150, Math.max(150, n));
    return {
      x: clamp(((v.left + v.width / 2 - r.left) / r.width) * PLAN_WIDTH, PLAN_WIDTH),
      y: clamp(((v.top + v.height / 2 - r.top) / r.height) * PLAN_HEIGHT, PLAN_HEIGHT),
    };
  };
  const [selectedId, setSelectedIdRaw] = useState<string | null>(rawTables[0]?.id ?? null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id);
    setSelectedItemId(null);
    setSelectedSeat(null);
  };
  const selectItem = (id: string | null) => {
    setSelectedItemId(id);
    setSelectedIdRaw(null);
    setSelectedSeat(null);
  };
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [movedItems, setMovedItems] = useState<Record<string, ItemBox>>({});
  const [editingTable, setEditingTable] = useState(false);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number; rotation: number }>>({});
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const byId = new Map(guests.map((g) => [g.id, g]));
  // Moves show at once; the server's answer replaces them (decision 133).
  const [tables, changeSeats] = useOptimistic(rawTables, applySeatChange);
  const [look, setLook] = useOptimistic(display);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  /** Guest picked in the list: the next chair clicked gets them (touch and keyboard alternative to dragging). */
  const [armed, setArmed] = useState<string | null>(null);
  const [autoResult, setAutoResult] = useState<{ seated: string[]; left: number } | null>(null);
  const place = (guestId: string, tableId: string, seat: number | null) => {
    setArmed(null);
    start(async () => {
      changeSeats({ type: "place", guestId, tableId, seat });
      await placeGuestAction(guestId, tableId, seat);
    });
  };
  const unseat = (guestId: string) =>
    start(async () => {
      changeSeats({ type: "unseat", guestId });
      await unseatGuestAction(guestId, eventId);
    });
  const selectSeat = (tableId: string, seat: number) => {
    if (armed && editable) {
      const tb = tables.find((x) => x.id === tableId);
      if (tb && !(seat < tb.seats && tb.hidden.includes(seat))) return place(armed, tableId, seat);
    }
    setSelectedIdRaw(tableId);
    setSelectedItemId(null);
    setSelectedSeat({ tableId, seat });
  };

  // Dragging a guest (from the list or a chair) onto a chair, a table, or back to the list.
  const [dragGuest, setDragGuest] = useState<{ id: string; x: number; y: number } | null>(null);
  const dropRef = useRef<(id: string, x: number, y: number) => void>(() => {});
  useEffect(() => {
    dropRef.current = (id, x, y) => {
      const el = document.elementFromPoint(x, y);
      const chair = el?.closest<HTMLElement | SVGElement>("[data-seat]");
      if (chair) return place(id, chair.dataset.table!, Number(chair.dataset.seat));
      const table = el?.closest<HTMLElement>("[data-table-id]");
      if (table) return place(id, table.dataset.tableId!, null);
      if (el?.closest("[data-unseat-drop]") && tables.some((tb) => tb.guestIds.includes(id))) unseat(id);
    };
  });
  // Listeners go on at pointer-down (not in an effect), so even a very quick click is seen.
  const startGuestDrag = (id: string, e: React.PointerEvent, onClick?: () => void) => {
    if (!editable || e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev: PointerEvent) => {
      active ||= Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 5;
      if (active) setDragGuest({ id, x: ev.clientX, y: ev.clientY });
    };
    const done = (ev: PointerEvent, cancelled: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      setDragGuest(null);
      if (cancelled) return;
      if (active) dropRef.current(id, ev.clientX, ev.clientY);
      else onClick?.();
    };
    const up = (ev: PointerEvent) => done(ev, false);
    const cancel = (ev: PointerEvent) => done(ev, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setArmed(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const saveLook = (next: SeatDisplay) =>
    start(async () => {
      setLook(next);
      await seatingDisplayAction(next);
    });
  const autoSeat = () =>
    start(async () => {
      const res = await autoSeatAction(eventId);
      if (res.ok) setAutoResult({ seated: res.seated ?? [], left: res.left ?? 0 });
    });

  const selected = tables.find((tb) => tb.id === selectedId) ?? null;
  const selectedItem = items.find((it) => it.id === selectedItemId) ?? null;
  const itemBox = (it: FloorItemRow): ItemBox => movedItems[it.id] ?? it;
  const saveItemBox = (id: string, box: ItemBox) => {
    setMovedItems((m) => ({ ...m, [id]: box }));
    start(async () => void (await moveFloorItemAction(id, box)));
  };
  const seated = new Set(tables.flatMap((tb) => tb.guestIds));
  const unseated = guests.filter((g) => !seated.has(g.id));
  const households = groupBy(unseated, (g) => g.householdId);

  // Search: filters the unseated list and finds who is already seated where.
  const q = query.trim().toLowerCase();
  const matches = (g: SeatGuest) => g.name.toLowerCase().includes(q) || g.household.toLowerCase().includes(q);
  const shownHouseholds = q
    ? [...households.entries()].flatMap(([hid, members]) => {
        const hit = members.filter(matches);
        return hit.length ? [[hid, hit] as const] : [];
      })
    : [...households.entries()];
  const seatedMatches = q
    ? tables.flatMap((tb) => tb.guestIds.flatMap((id) => (byId.get(id) && matches(byId.get(id)!) ? [{ guest: byId.get(id)!, table: tb }] : [])))
    : [];
  const highlight = new Set(seatedMatches.map((m) => m.guest.id));

  const pos = (tb: TableRow) => moved[tb.id] ?? { x: tb.x, y: tb.y, rotation: tb.rotation };
  const seat = (ids: string[]) => selected && start(async () => void (await seatGuestsAction(selected.id, ids)));

  const floorPlan = (
    <FloorPlan
              mode={mode}
              eventId={eventId}
              planRef={planRef}
              viewportRef={viewportRef}
              tables={tables}
              pos={pos}
              items={items}
              itemBox={itemBox}
              selectedItemId={selectedItemId}
              onSelectItem={selectItem}
              onMoveItem={saveItemBox}
              selectedId={selectedId}
              editable={editable}
              onSelect={setSelectedId}
              onMove={(id, p) => {
                setMoved((m) => ({ ...m, [id]: p }));
                start(async () => void (await moveTableAction(id, p.x, p.y, p.rotation)));
              }}
              occupancy={(tb) => tb.guestIds.length}
              guestOf={(id) => byId.get(id)}
              highlight={highlight}
              look={look}
              selectedSeat={selectedSeat}
              onSelectSeat={selectSeat}
              onGuestPointerDown={(id, e, seat) => startGuestDrag(id, e, () => selectSeat(seat.tableId, seat.seat))}
              armed={armed !== null}
            />
  );
  const seatTable = selectedSeat ? tables.find((tb) => tb.id === selectedSeat.tableId) : undefined;
  const seatGuest = seatTable && selectedSeat ? byId.get(seatTable.chairs.find((c) => c.seat === selectedSeat.seat)?.guestId ?? "") : undefined;
  const seatHidden = !!seatTable && !!selectedSeat && selectedSeat.seat < seatTable.seats && seatTable.hidden.includes(selectedSeat.seat);
  const guestRow = (g: SeatGuest, extra?: React.ReactNode) => (
    <li
      key={g.id}
      className={cn(
        "flex items-center gap-1.5 rounded-md py-0.5 pr-1 text-sm",
        armed === g.id && "bg-rosehip ring-1 ring-vranec/40",
      )}
    >
      {editable && (
        <span
          onPointerDown={(e) => startGuestDrag(g.id, e)}
          title={t("dragGuest")}
          className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded text-stone hover:bg-linen active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </span>
      )}
      <FigureBadge look={g} plain={look.plain} size={22} className="shrink-0" />
      {editable ? (
        <button
          type="button"
          aria-pressed={armed === g.id}
          onClick={() => setArmed((a) => (a === g.id ? null : g.id))}
          className="min-w-0 flex-1 truncate text-left text-ink-soft hover:text-ink"
        >
          {g.name}
          {g.rsvp === "PENDING" && <span className="ml-1 text-xs text-stone">· {t("waiting")}</span>}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-ink-soft">{g.name}</span>
      )}
      {extra}
    </li>
  );
  const panel = (
          <div className="space-y-4">
            {seatTable && selectedSeat && (
              <Card className="p-4">
                <h2 className="font-semibold">
                  {t("seatTitle", { table: seatTable.name, n: selectedSeat.seat + 1 })}
                </h2>
                {seatGuest ? (
                  <div className="mt-3 flex items-center gap-3">
                    <FigureBadge look={seatGuest} plain={look.plain} size={52} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{seatGuest.name}</p>
                      <p className="text-sm text-stone">{seatGuest.role ? tg(`roles.${seatGuest.role}`) : seatGuest.household}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-stone">
                    {seatHidden ? t("seatHidden") : editable ? t("seatFreeHint") : t("seatFree")}
                  </p>
                )}
                {editable && (
                  <div className="mt-3 grid gap-2">
                    {seatGuest && (
                      <Button variant="secondary" size="sm" onClick={() => unseat(seatGuest.id)}>
                        <X aria-hidden className="size-4" /> {t("releaseSeat")}
                      </Button>
                    )}
                    {selectedSeat.seat < seatTable.seats && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!!seatGuest || pending}
                        title={seatGuest ? t("hideSeatTaken") : undefined}
                        onClick={() => start(async () => void (await hideSeatAction(seatTable.id, selectedSeat.seat, !seatHidden)))}
                      >
                        {seatHidden ? <Eye aria-hidden className="size-4" /> : <EyeOff aria-hidden className="size-4" />}
                        {seatHidden ? t("showSeat") : t("hideSeat")}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
            {selectedItem && (
              <Card className="p-4">
                {editingItem ? (
                  <ItemForm eventId={eventId} item={selectedItem} onDone={() => setEditingItem(false)} />
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{selectedItem.name}</h2>
                      <p className="text-sm text-stone">{t(`items.${selectedItem.kind}`)}</p>
                      {editable && <p className="mt-1 text-xs text-stone">{t("itemHint")}</p>}
                    </div>
                    {editable && (
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("rotate")}
                          onClick={() => {
                            const b = itemBox(selectedItem);
                            saveItemBox(selectedItem.id, { ...b, rotation: (b.rotation + 90) % 360 });
                          }}
                        >
                          <RotateCw aria-hidden className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={t("editItem")} onClick={() => setEditingItem(true)}>
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("deleteItem")}
                          onClick={() => {
                            if (confirm(t("confirmDeleteItem", { name: selectedItem.name }))) {
                              start(async () => void (await deleteFloorItemAction(selectedItem.id)));
                              selectItem(null);
                            }
                          }}
                        >
                          <Trash2 aria-hidden className="size-4 text-danger" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
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
                          {t(`shapes.${selected.shape}`)} · <Occupancy seated={selected.guestIds.length} seats={openSeats(selected)} />
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
                        {selected.chairs.map(({ guestId: id, seat: n }) => {
                          const g = byId.get(id);
                          if (!g) return null;
                          return (
                            <li key={id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                              <button
                                type="button"
                                onClick={() => selectSeat(selected.id, n)}
                                className="min-w-0 text-left hover:text-vranec"
                              >
                                <span className={cn("mr-1.5 inline-block w-5 text-right tabular-nums", n >= selected.seats ? "text-danger" : "text-stone")}>
                                  {n + 1}
                                </span>
                                {g.name} <span className="text-stone">· {g.role ? tg(`roles.${g.role}`) : g.household}</span>
                              </button>
                              {editable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`${t("unseat")}: ${g.name}`}
                                  disabled={pending}
                                  onClick={() => unseat(id)}
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

            {editable && (
              <Card className="p-4">
                <h2 className="text-sm font-medium">{t("display")}</h2>
                <div className="mt-2 grid gap-2 text-sm">
                  <Segmented
                    label={t("figures")}
                    value={look.plain ? "plain" : "colour"}
                    options={[
                      ["colour", t("figuresColour")],
                      ["plain", t("figuresPlain")],
                    ]}
                    onChange={(v) => saveLook({ ...look, plain: v === "plain" })}
                  />
                  <Segmented
                    label={t("names")}
                    value={look.firstNames ? "first" : "full"}
                    options={[
                      ["full", t("namesFull")],
                      ["first", t("namesFirst")],
                    ]}
                    onChange={(v) => saveLook({ ...look, firstNames: v === "first" })}
                  />
                </div>
              </Card>
            )}

            <Card className="p-4" data-unseat-drop>
              <h2 className="font-medium">{t("unseated", { count: unseated.length })}</h2>
              <p className="mt-1 text-sm text-stone">
                {unseated.length === 0
                  ? t("unseatedEmpty")
                  : !editable
                    ? null
                    : armed
                      ? t("armedHint", { name: byId.get(armed)?.name ?? "" })
                      : t("guestPanelHint")}
              </p>
              {editable && unseated.length > 0 && (
                <Button variant="secondary" className="mt-3 w-full" disabled={pending} onClick={autoSeat}>
                  <Wand2 aria-hidden className="size-4" /> {t("autoSeat")}
                </Button>
              )}
              {autoResult && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-rosehip px-3 py-2 text-sm" role="status">
                  <span>{t("autoSeatDone", { seated: autoResult.seated.length, left: autoResult.left })}</span>
                  {autoResult.seated.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        const ids = autoResult.seated;
                        setAutoResult(null);
                        start(async () => void (await undoAutoSeatAction(eventId, ids)));
                      }}
                    >
                      <Undo2 aria-hidden className="size-4" /> {t("undo")}
                    </Button>
                  )}
                </div>
              )}
              {guests.length > 0 && (
                <div className="relative mt-3">
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
              )}
              {seatedMatches.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-stone">{t("alreadySeated")}</h3>
                  <ul className="mt-1 divide-y divide-line">
                    {seatedMatches.map(({ guest, table }) => (
                      <li key={guest.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const c = table.chairs.find((x) => x.guestId === guest.id);
                            if (c) selectSeat(table.id, c.seat);
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded py-1.5 text-left text-sm hover:text-vranec"
                        >
                          <span>{guest.name}</span>
                          <span className="shrink-0 text-stone">
                            {table.name} · {t("seatNumber", { n: (table.chairs.find((x) => x.guestId === guest.id)?.seat ?? 0) + 1 })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {q && seatedMatches.length === 0 && shownHouseholds.length === 0 && (
                <p className="mt-3 text-sm text-stone">{t("searchEmpty")}</p>
              )}
              {shownHouseholds.length > 0 && (
                <ul className={cn("mt-3 space-y-3 overflow-y-auto pr-1", mode === "editor" ? "max-h-[50vh]" : "max-h-[28rem]")}>
                  {shownHouseholds.map(([hid, members]) => (
                    <li key={hid} className="rounded-lg border border-line p-2">
                      <div className="flex items-center justify-between gap-2 pl-1">
                        <span className="text-sm font-medium">{members[0]!.household}</span>
                        {editable && households.get(hid)!.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!selected || pending}
                            title={selected ? t("selected", { name: selected.name }) : t("selectTable")}
                            onClick={() => seat(households.get(hid)!.map((m) => m.id))}
                          >
                            <Users aria-hidden className="size-4" /> {t("seatFamily")}
                          </Button>
                        )}
                      </div>
                      <ul className="mt-1">
                        {members.map((g) =>
                          guestRow(
                            g,
                            editable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!selected || pending}
                                title={selected ? t("selected", { name: selected.name }) : t("selectTable")}
                                aria-label={`${t("seat")}: ${g.name}`}
                                onClick={() =>
                                  selected &&
                                  place(g.id, selected.id, selectedSeat && selectedSeat.tableId === selected.id && !seatGuest && !seatHidden ? selectedSeat.seat : null)
                                }
                              >
                                <UserPlus aria-hidden className="size-4" />
                              </Button>
                            ),
                          ),
                        )}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
  );

  // Picture picker (decision 128): drop the new table or element in the middle of the view and select it.
  const picker = picking && (
    <AddPicker
      onClose={() => setPicking(false)}
      onPick={(choice) => {
        setPicking(false);
        const c = viewCenter();
        start(async () => {
          const res =
            choice.type === "table"
              ? await addTableAction(eventId, choice.shape, c.x, c.y)
              : await addFloorItemAction(eventId, choice.kind, c.x, c.y);
          if (res.ok && res.id) {
            if (choice.type === "table") setSelectedId(res.id);
            else selectItem(res.id);
          }
        });
      }}
    />
  );

  const ghostGuest = dragGuest ? byId.get(dragGuest.id) : undefined;
  const ghost = ghostGuest && dragGuest && (
    <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2" style={{ left: dragGuest.x, top: dragGuest.y }}>
      <FigureBadge look={ghostGuest} plain={look.plain} size={44} className="drop-shadow" />
      <span className="mt-0.5 block whitespace-nowrap rounded bg-surface/90 px-1.5 text-center text-xs shadow-sm">{ghostGuest.name}</span>
    </div>
  );

  if (mode === "editor") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-linen">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/80 px-4 py-2 backdrop-blur">
          <Link href={{ pathname: "/plan/seating", query: { event: eventId } }} className={buttonClass("secondary", "sm")}>
            <X aria-hidden className="size-4" /> {t("closeEditor")}
          </Link>
          {events.length > 1 && (
            <nav className="flex flex-wrap gap-1" aria-label={t("event")}>
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={{ pathname: "/plan/seating/edit", query: { event: e.id } }}
                  aria-current={e.id === eventId ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-sm",
                    e.id === eventId ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  {e.name}
                </Link>
              ))}
            </nav>
          )}
          <p className="ml-auto hidden text-sm text-stone xl:block">{t("editorHint")}</p>
          {editable && (
            <div className="ml-auto flex gap-2 xl:ml-0">
              <Button
                variant="secondary"
                size="sm"
                title={t("headTableHint")}
                disabled={pending}
                onClick={() => start(async () => void (await headTableAction(eventId, locale)))}
              >
                <Crown aria-hidden className="size-4" /> {t("headTable")}
              </Button>
              <Button size="sm" onClick={() => setPicking(true)}>
                <Plus aria-hidden className="size-4" /> {t("addElement")}
              </Button>
            </div>
          )}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px]">
          <div className="relative min-h-0 min-w-0">{floorPlan}</div>
          <div className="min-h-0 overflow-y-auto border-l border-line bg-linen p-4">{panel}</div>
        </div>
        {picker}
        {ghost}
      </div>
    );
  }

  return (
    <>
    {/* What the restaurant gets when the page is printed: tables and their guests only. */}
    <SeatingPrintList tables={tables} byId={byId} couple={couple} eventName={eventName} />
    <div className="space-y-5 print:hidden">
      {picker}
      {ghost}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hidden text-sm text-stone lg:block">{editable && t("dragHint")}</p>
        <div className="flex flex-wrap gap-2">
          <SeatingListActions tables={tables} byId={byId} eventName={eventName} />
          {editable && (
            <>
              <Button
                variant="secondary"
                title={t("headTableHint")}
                disabled={pending}
                onClick={() => start(async () => void (await headTableAction(eventId, locale)))}
              >
                <Crown aria-hidden className="size-4" /> {t("headTable")}
              </Button>
              <Button variant="secondary" onClick={() => setPicking(true)} className="hidden lg:inline-flex">
                <Shapes aria-hidden className="size-4" /> {t("addElement")}
              </Button>
              {!adding && (
                <Button onClick={() => setAdding(true)}>
                  <Plus aria-hidden className="size-4" /> {t("addTable")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {adding && (
        <Card className="border-vranec/30 p-5">
          <TableForm eventId={eventId} table={null} onDone={() => setAdding(false)} />
        </Card>
      )}

      {tables.length === 0 && items.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{t("noTables")}</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            {/* Floor plan: tablet/desktop only (decision 68). */}
            {floorPlan}
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
                      <Occupancy seated={tb.guestIds.length} seats={openSeats(tb)} />
                    </span>
                    <span className="mt-1 block text-sm text-stone">
                      {tb.chairs.flatMap((c) => (byId.has(c.guestId) ? [`${c.seat + 1}. ${byId.get(c.guestId)!.name}`] : [])).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {panel}
        </div>
      )}
    </div>
    </>
  );
}

/** Two-choice switch, e.g. coloured / plain figures. */
function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-stone">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line-strong bg-surface p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => value !== v && onChange(v)}
            className={cn("rounded-full px-2.5 py-0.5 text-xs", value === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
          >
            {text}
          </button>
        ))}
      </div>
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
  mode,
  eventId,
  planRef,
  viewportRef,
  tables,
  pos,
  items,
  itemBox,
  selectedItemId,
  onSelectItem,
  onMoveItem,
  selectedId,
  editable,
  onSelect,
  onMove,
  occupancy,
  guestOf,
  highlight,
  look,
  selectedSeat,
  onSelectSeat,
  onGuestPointerDown,
  armed,
}: {
  guestOf: (guestId: string) => SeatGuest | undefined;
  look: SeatDisplay;
  selectedSeat: Seat | null;
  onSelectSeat: (tableId: string, seat: number) => void;
  onGuestPointerDown: (guestId: string, e: React.PointerEvent, seat: Seat) => void;
  /** A guest is picked in the list: chairs invite a click. */
  armed: boolean;
  tables: TableRow[];
  pos: (tb: TableRow) => { x: number; y: number; rotation: number };
  items: FloorItemRow[];
  itemBox: (it: FloorItemRow) => ItemBox;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onMoveItem: (id: string, box: ItemBox) => void;
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, p: { x: number; y: number; rotation: number }) => void;
  occupancy: (tb: TableRow) => number;
  highlight: Set<string>;
  mode: "page" | "editor";
  eventId: string;
  planRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("plan.seating");
  const editor = mode === "editor";
  const ref = planRef;
  const viewport = viewportRef;
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; startX: number; startY: number; moved: boolean; seat: number | null } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number; left: number; top: number } | null>(null);
  const [turning, setTurning] = useState<{ id: string; deg: number } | null>(null);

  // Smallest zoom: the whole plan fits the view (editor), or the plan fills the width (page).
  const [minZoom, setMinZoom] = useState(1);
  const minRef = useRef(1);
  const zoomRef = useRef(zoom);

  const toPlan = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(PLAN_WIDTH, Math.max(0, ((clientX - r.left) / r.width) * PLAN_WIDTH)),
      y: Math.min(PLAN_HEIGHT, Math.max(0, ((clientY - r.top) / r.height) * PLAN_HEIGHT)),
    };
  };

  // Zoom keeping the point under `anchor` (client coordinates; default: middle of the view) in place.
  const zoomTo = (next: number, anchor?: { x: number; y: number }) => {
    const v = viewport.current;
    const c = ref.current;
    if (!v || !c) return;
    const z = Math.round(Math.min(MAX_ZOOM, Math.max(minRef.current, next)) * 1000) / 1000;
    if (z === zoomRef.current) return;
    const vr = v.getBoundingClientRect();
    const at = anchor ?? { x: vr.left + vr.width / 2, y: vr.top + vr.height / 2 };
    // Several wheel ticks can arrive before a redraw: keep the first tick's spot on the plan.
    if (!anchorRef.current || anchorRef.current.at.x !== at.x || anchorRef.current.at.y !== at.y) {
      const r = c.getBoundingClientRect();
      anchorRef.current = { at, fx: (at.x - r.left) / r.width, fy: (at.y - r.top) / r.height };
    }
    zoomRef.current = z;
    setZoom(z);
  };
  // After the plan is redrawn at the new zoom, scroll so the anchored spot is back under the pointer.
  const anchorRef = useRef<{ at: { x: number; y: number }; fx: number; fy: number } | null>(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    const v = viewport.current;
    const c = ref.current;
    if (!a || !v || !c) return;
    const n = c.getBoundingClientRect();
    v.scrollBy({ left: n.left + a.fx * n.width - a.at.x, top: n.top + a.fy * n.height - a.at.y });
    anchorRef.current = null;
  }, [zoom, viewport, ref]);
  const zoomToRef = useRef(zoomTo);
  useEffect(() => {
    zoomToRef.current = zoomTo;
  });

  // Editor: keep "whole plan fits" up to date with the window size; it opens at that zoom.
  useEffect(() => {
    const v = viewport.current;
    if (!editor || !v) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (!v.clientWidth) return;
      const m = Math.min(1, ((v.clientHeight - 32) / v.clientWidth) * (PLAN_WIDTH / PLAN_HEIGHT));
      minRef.current = m;
      setMinZoom(m);
      if (first || zoomRef.current < m) {
        zoomRef.current = m;
        setZoom(m);
      }
      first = false;
    });
    ro.observe(v);
    return () => ro.disconnect();
  }, [editor, viewport]);

  // Editor (decision 127): the wheel zooms around the cursor, sideways swipes pan.
  // Page: Ctrl + wheel (and trackpad pinch) zooms, plain wheel scrolls.
  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const onWheel = (e: WheelEvent) => {
      const pinch = e.ctrlKey || e.metaKey;
      if (!editor && !pinch) return;
      if (editor && !pinch && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // sideways swipe: let it pan
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      zoomToRef.current(zoomRef.current * Math.exp(-step * (pinch ? 0.01 : 0.0015)), { x: e.clientX, y: e.clientY });
    };
    v.addEventListener("wheel", onWheel, { passive: false });
    return () => v.removeEventListener("wheel", onWheel);
  }, [editor, viewport]);

  const zoomButtons = (
    <>
      <Button variant="ghost" size="sm" aria-label={t("zoomOut")} title={t("zoomOut")} disabled={zoom <= minZoom} onClick={() => zoomTo(zoom / ZOOM_STEP)}>
        {editor ? <Minus aria-hidden className="size-4" /> : <ZoomOut aria-hidden className="size-4" />}
      </Button>
      <button
        type="button"
        onClick={() => zoomTo(minZoom)}
        title={editor ? t("fitPlan") : t("zoomReset")}
        className="min-w-14 rounded-md px-2 py-1 text-sm tabular-nums text-ink-soft hover:bg-linen"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button variant="ghost" size="sm" aria-label={t("zoomIn")} title={t("zoomIn")} disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * ZOOM_STEP)}>
        {editor ? <Plus aria-hidden className="size-4" /> : <ZoomIn aria-hidden className="size-4" />}
      </Button>
    </>
  );

  // Dragging empty floor moves the view (decision 127).
  const panHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || (e.target !== ref.current && e.target !== viewport.current)) return;
      const v = viewport.current!;
      try {
        v.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers can't be captured; panning still works.
      }
      setPan({ x: e.clientX, y: e.clientY, left: v.scrollLeft, top: v.scrollTop });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pan) return;
      viewport.current?.scrollTo({ left: pan.left - (e.clientX - pan.x), top: pan.top - (e.clientY - pan.y) });
    },
    onPointerUp: () => setPan(null),
  };

  return (
    <div className={editor ? "absolute inset-0" : "hidden space-y-2 lg:block"}>
      {!editor && (
        <div className="flex items-center justify-end gap-1">
          {zoomButtons}
          <Link href={{ pathname: "/plan/seating/edit", query: { event: eventId } }} className={buttonClass("secondary", "sm")}>
            <Maximize2 aria-hidden className="size-4" /> {t("openEditor")}
          </Link>
        </div>
      )}
      {editor && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1 rounded-xl border border-line bg-surface/90 p-1 shadow-sm backdrop-blur">
          <Button variant="ghost" size="sm" aria-label={t("zoomIn")} title={t("zoomIn")} disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * ZOOM_STEP)}>
            <Plus aria-hidden className="size-4" />
          </Button>
          <span className="text-xs tabular-nums text-stone">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" aria-label={t("zoomOut")} title={t("zoomOut")} disabled={zoom <= minZoom} onClick={() => zoomTo(zoom / ZOOM_STEP)}>
            <Minus aria-hidden className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label={t("fitPlan")} title={t("fitPlan")} onClick={() => zoomTo(minZoom)}>
            <Locate aria-hidden className="size-4" />
          </Button>
        </div>
      )}
      <div
        ref={viewport}
        {...panHandlers}
        className={cn(
          "overflow-auto",
          editor
            ? "h-full w-full bg-[#fbfaf8] [background-image:linear-gradient(rgb(60_36_70/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(60_36_70/0.05)_1px,transparent_1px)] [background-size:24px_24px]"
            : "rounded-[var(--radius-card)] border border-line bg-surface",
          pan ? "cursor-grabbing" : editor && "cursor-grab",
        )}
        style={editor ? undefined : { maxHeight: "75vh" }}
      >
        <div
          ref={ref}
          className={cn("@container relative select-none overflow-hidden", editor && "mx-auto my-4 bg-surface shadow-[var(--shadow-card)]")}
          style={{
            width: `${zoom * 100}%`,
            aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}`,
            backgroundImage: "radial-gradient(circle, rgb(35 26 29 / 0.09) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {items.map((it) => (
            <FloorItemBox
              key={it.id}
              item={it}
              box={itemBox(it)}
              selected={selectedItemId === it.id}
              editable={editable}
              toPlan={toPlan}
              planRect={() => ref.current!.getBoundingClientRect()}
              onSelect={() => onSelectItem(it.id)}
              onChange={(box) => onMoveItem(it.id, box)}
            />
          ))}
          {tables.map((tb) => {
            const base = drag?.id === tb.id ? { ...pos(tb), x: drag.x, y: drag.y } : pos(tb);
            const p = turning?.id === tb.id ? { ...base, rotation: turning.deg } : base;
            const seated = occupancy(tb);
            const chairs = chairCount(tb);
            const size = tableSize(tb.shape, chairs);
            const over = seated > openSeats(tb) || chairs > tb.seats;
            const at = new Map(tb.chairs.map((c) => [c.seat, c.guestId]));
            return (
              <button
                key={tb.id}
                type="button"
                data-table-id={tb.id}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const chairEl = (e.target as Element).closest<SVGElement>("[data-seat], [data-hidden-seat]");
                  const seatNo = chairEl ? Number(chairEl.dataset.seat ?? chairEl.dataset.hiddenSeat) : null;
                  // A seated guest: drag them to another chair, or click to open the chair (decision 133).
                  const guestId = chairEl?.dataset.guest;
                  if (guestId && editable && seatNo !== null) return onGuestPointerDown(guestId, e, { tableId: tb.id, seat: seatNo });
                  if (seatNo === null) onSelect(tb.id);
                  if (!editable) {
                    if (seatNo !== null) onSelectSeat(tb.id, seatNo);
                    return;
                  }
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Synthetic or already-released pointers can't be captured; dragging still works without it.
                  }
                  setDrag({ id: tb.id, x: p.x, y: p.y, startX: e.clientX, startY: e.clientY, moved: false, seat: seatNo });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.id !== tb.id) return;
                  const moved = drag.moved || Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4;
                  setDrag({ ...drag, ...toPlan(e.clientX, e.clientY), moved });
                }}
                onPointerUp={() => {
                  if (drag?.id === tb.id && drag.moved) onMove(tb.id, { x: drag.x, y: drag.y, rotation: p.rotation });
                  else if (drag?.id === tb.id && drag.seat !== null) onSelectSeat(tb.id, drag.seat);
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
                  tb.shape === "HEAD" ? "border-vranec bg-rosehip" : "border-line-strong bg-linen",
                  tableShapeClass[tb.shape],
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
                {selectedId === tb.id && editable && tb.shape !== "ROUND" && (
                  <RotateHandle
                    lift={`${(CHAIR + 2 * GAP) / (PLAN_WIDTH / 100)}cqw`}
                    onTurn={(deg) => setTurning({ id: tb.id, deg })}
                    onDone={(deg) => {
                      setTurning(null);
                      onMove(tb.id, { x: base.x, y: base.y, rotation: deg });
                    }}
                  />
                )}
                {chairSpots(tb.shape, chairs, size.w, size.h).map((c, i) => {
                  const guestId = at.get(i);
                  const guest = guestId ? guestOf(guestId) : undefined;
                  const hidden = !guest && i < tb.seats && tb.hidden.includes(i);
                  // Hidden chairs only show (faintly) while their table is selected, so they can be shown again.
                  if (hidden && !(editable && selectedId === tb.id)) return null;
                  const face = facing(tb.shape, c, size.w, size.h);
                  const isSelected = selectedSeat?.tableId === tb.id && selectedSeat.seat === i;
                  const ring = isSelected
                    ? "var(--color-vranec)"
                    : guestId && highlight.has(guestId)
                      ? "var(--color-ink)"
                      : i >= tb.seats
                        ? "var(--color-danger)"
                        : null;
                  const box = CHAIR * 3;
                  return (
                    <svg
                      key={i}
                      viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
                      overflow="visible"
                      className="pointer-events-none absolute"
                      style={{
                        left: `${((c.x - box / 2) / size.w) * 100}%`,
                        top: `${((c.y - box / 2) / size.h) * 100}%`,
                        width: `${(box / size.w) * 100}%`,
                        height: `${(box / size.h) * 100}%`,
                        zIndex: isSelected || (guestId && highlight.has(guestId)) ? 10 : undefined,
                      }}
                    >
                      {ring && <circle r={14.5} fill="none" stroke={ring} strokeWidth={2} />}
                      <g transform={`rotate(${face.deg.toFixed(1)})`}>
                        {guest ? <FigureShape look={guest} plain={look.plain} /> : <EmptyChair number={i + 1} hidden={hidden} />}
                      </g>
                      {guest && (
                        <SeatName name={guest.name} firstOnly={look.firstNames} angle={face.out + (p.rotation * Math.PI) / 180} />
                      )}
                      <circle
                        r={13}
                        fill="transparent"
                        pointerEvents="all"
                        className={cn(editable && (guest ? "cursor-grab" : armed ? "cursor-copy" : "cursor-pointer"))}
                        {...(hidden ? { "data-hidden-seat": i } : { "data-seat": i, "data-table": tb.id })}
                        {...(guestId ? { "data-guest": guestId } : {})}
                      >
                        <title>{guest ? `${guest.name} · ${t("seatNumber", { n: i + 1 })}` : t("seatNumber", { n: i + 1 })}</title>
                      </circle>
                    </svg>
                  );
                })}
                <span
                  className={cn(
                    "max-w-full truncate px-1 font-medium leading-tight",
                    // A row of chairs has no table top: its name sits under the chairs.
                    tb.shape === "ROW" && "absolute top-full mt-[0.6cqw] max-w-none whitespace-nowrap",
                  )}
                  style={{ transform: `rotate(${-p.rotation}deg)`, fontSize: `${LABEL / (PLAN_WIDTH / 100)}cqw` }}
                >
                  {tb.name}
                  <span className={cn("block tabular-nums", over ? "text-danger" : "text-stone")}>
                    {occupancy(tb)}/{tb.seats}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Fill and outline per room element (decision 129). */
const itemStyle: Partial<Record<FloorItemKind, string>> = {
  DANCE_FLOOR: "border-vranec/40 bg-rosehip/70",
  DANCE_FLOOR_ROUND: "border-vranec/40 bg-rosehip/70",
  STAGE: "border-vranec/40 border-dashed bg-rosehip/50",
  BAND: "border-ink-soft/30 bg-line/70",
  LABEL: "border-dashed border-line-strong bg-surface/80",
  TENT: "border-dashed border-ink-soft/50 bg-transparent",
  BUFFET_LONG: "border-line-strong bg-linen",
  BUFFET_ROUND: "border-line-strong bg-linen",
  WALL: "border-transparent bg-ink/80",
  PILLAR: "border-transparent bg-ink/80",
};
const itemShape: Record<(typeof FLOOR_ITEM_LOOK)[FloorItemKind], string> = {
  area: "rounded-xl",
  round: "rounded-full",
  half: "rounded-t-full",
  buffet: "rounded-lg",
  buffetRound: "rounded-full",
  wall: "rounded-sm",
  pillar: "rounded-sm",
  icon: "rounded-xl border-transparent",
};
const checker = {
  backgroundImage:
    "linear-gradient(45deg, rgb(138 79 125 / 0.08) 25%, transparent 25%, transparent 75%, rgb(138 79 125 / 0.08) 75%), linear-gradient(45deg, rgb(138 79 125 / 0.08) 25%, transparent 25%, transparent 75%, rgb(138 79 125 / 0.08) 75%)",
  backgroundSize: "1.6cqw 1.6cqw",
  backgroundPosition: "0 0, 0.8cqw 0.8cqw",
};

/** Turn angle (degrees) from an element's centre to the pointer; 15° steps unless Shift is held (decision 129). */
function pointerAngle(cx: number, cy: number, e: { clientX: number; clientY: number; shiftKey: boolean }) {
  const deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
  const a = e.shiftKey ? Math.round(deg) : Math.round(deg / 15) * 15;
  return ((a % 360) + 360) % 360;
}

/** The round handle above a selected table or element: drag it to turn the item. */
function RotateHandle({
  onTurn,
  onDone,
  lift,
}: {
  onTurn: (deg: number) => void;
  onDone: (deg: number) => void;
  /** Extra gap above the item (a CSS length), e.g. to clear a table's chairs. */
  lift?: string;
}) {
  const t = useTranslations("plan.seating");
  // deg stays null until the pointer moves, so a plain click on the handle doesn't reset the angle.
  const [centre, setCentre] = useState<{ x: number; y: number; deg: number | null } | null>(null);
  return (
    <span
      aria-hidden
      title={t("rotateHandle")}
      className="absolute bottom-full left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
      style={lift ? { marginBottom: lift } : undefined}
      onPointerDown={(e) => {
        e.stopPropagation();
        const r = e.currentTarget.parentElement!.getBoundingClientRect();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointers can't be captured; turning still works.
        }
        setCentre({ x: r.left + r.width / 2, y: r.top + r.height / 2, deg: null });
      }}
      onPointerMove={(e) => {
        // Keep the move away from the item underneath, or its drag handler moves it and undoes the turn.
        e.stopPropagation();
        if (!centre) return;
        const deg = pointerAngle(centre.x, centre.y, e);
        setCentre({ ...centre, deg });
        onTurn(deg);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (centre && centre.deg !== null) onDone(centre.deg);
        setCentre(null);
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        if (centre && centre.deg !== null) onDone(centre.deg);
        setCentre(null);
      }}
    >
      <span className="grid size-5 cursor-grab place-items-center rounded-full border-2 border-vranec bg-surface text-vranec shadow-sm active:cursor-grabbing">
        <RotateCw className="size-3" />
      </span>
      <span className="h-3 w-0.5 bg-vranec/60" />
    </span>
  );
}

/**
 * A room element on the floor plan (decision 119): drag to move, drag the corner handle to resize
 * (the opposite corner stays put), arrow keys nudge.
 */
function FloorItemBox({
  item,
  box,
  selected,
  editable,
  toPlan,
  planRect,
  onSelect,
  onChange,
}: {
  item: FloorItemRow;
  box: ItemBox;
  selected: boolean;
  editable: boolean;
  toPlan: (clientX: number, clientY: number) => { x: number; y: number };
  planRect: () => DOMRect;
  onSelect: () => void;
  onChange: (box: ItemBox) => void;
}) {
  const t = useTranslations("plan.seating");
  // "turn" is driven by the rotate handle; the item's own move/resize handlers ignore it.
  type Gesture = { mode: "move" | "resize" | "turn"; startX: number; startY: number; start: ItemBox; box: ItemBox; moved: boolean };
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const b = gesture?.box ?? box;
  const look = FLOOR_ITEM_LOOK[item.kind];
  // Trees, hedges and the like show no name unless the couple gave them one.
  const showName = !QUIET_KINDS.has(item.kind) || item.name !== t(`items.${item.kind}`);

  const begin = (mode: Gesture["mode"]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    if (!editable) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers can't be captured; the gesture still works.
    }
    setGesture({ mode, startX: e.clientX, startY: e.clientY, start: box, box, moved: false });
  };
  const move = (e: React.PointerEvent) => {
    if (!gesture || gesture.mode === "turn") return;
    const moved = gesture.moved || Math.abs(e.clientX - gesture.startX) + Math.abs(e.clientY - gesture.startY) > 4;
    const s = gesture.start;
    if (gesture.mode === "move") {
      const a = toPlan(gesture.startX, gesture.startY);
      const p = toPlan(e.clientX, e.clientY);
      setGesture({ ...gesture, moved, box: { ...s, x: s.x + p.x - a.x, y: s.y + p.y - a.y } });
      return;
    }
    // Resize: pointer delta in plan units, turned into the element's own axes.
    const r = planRect();
    const dx = ((e.clientX - gesture.startX) / r.width) * PLAN_WIDTH;
    const dy = ((e.clientY - gesture.startY) / r.height) * PLAN_HEIGHT;
    const a = (s.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(a) + dy * Math.sin(a);
    const ly = -dx * Math.sin(a) + dy * Math.cos(a);
    const width = Math.max(FLOOR_ITEM_MIN, s.width + lx);
    const height = Math.max(FLOOR_ITEM_MIN, s.height + ly);
    const gx = (width - s.width) / 2;
    const gy = (height - s.height) / 2;
    setGesture({
      ...gesture,
      moved,
      box: { ...s, width, height, x: s.x + gx * Math.cos(a) - gy * Math.sin(a), y: s.y + gx * Math.sin(a) + gy * Math.cos(a) },
    });
  };
  const end = () => {
    if (gesture?.mode === "turn") return;
    if (gesture?.moved) onChange(gesture.box);
    setGesture(null);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${t(`items.${item.kind}`)}: ${item.name}`}
      onPointerDown={begin("move")}
      onPointerMove={move}
      onPointerUp={end}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 50 : 10;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d || !editable) return;
        e.preventDefault();
        onChange({ ...box, x: box.x + d[0]!, y: box.y + d[1]! });
      }}
      className={cn(
        "absolute flex touch-none flex-col items-center justify-center border-2 text-center",
        itemStyle[item.kind],
        itemShape[look],
        editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        selected && "ring-4 ring-vranec/25",
      )}
      style={{
        left: `${(b.x / PLAN_WIDTH) * 100}%`,
        top: `${(b.y / PLAN_HEIGHT) * 100}%`,
        width: `${(b.width / PLAN_WIDTH) * 100}%`,
        height: `${(b.height / PLAN_HEIGHT) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${b.rotation}deg)`,
        ...((item.kind === "DANCE_FLOOR" || item.kind === "DANCE_FLOOR_ROUND") && checker),
      }}
    >
      {look === "icon" ? (
        <span className="flex h-full w-full flex-col items-center justify-center" style={{ transform: `rotate(${-b.rotation}deg)` }}>
          <FloorIcon kind={item.kind} strokeWidth={1.3} className={cn("min-h-0 w-full flex-1 text-ink-soft", showName && "max-h-[78%]")} />
          {showName && (
            <span
              className="max-w-[160%] truncate font-medium leading-tight text-ink-soft"
              style={{ fontSize: `${LABEL / (PLAN_WIDTH / 100)}cqw` }}
            >
              {item.name}
            </span>
          )}
        </span>
      ) : look === "wall" || look === "pillar" ? (
        <span className="sr-only">{item.name}</span>
      ) : (
        <span
          className="flex max-w-full items-center gap-1 truncate px-1 font-medium text-ink-soft"
          style={{ transform: `rotate(${-b.rotation}deg)`, fontSize: `${ITEM_LABEL / (PLAN_WIDTH / 100)}cqw` }}
        >
          {hasFloorIcon(item.kind) && <FloorIcon kind={item.kind} strokeWidth={2.2} className="size-[1.3em] shrink-0 text-vranec" />}
          <span className="truncate">{item.name}</span>
        </span>
      )}
      {selected && editable && (
        <>
          <RotateHandle
            onTurn={(deg) => setGesture({ mode: "turn", startX: 0, startY: 0, start: box, box: { ...box, rotation: deg }, moved: false })}
            onDone={(deg) => {
              setGesture(null);
              onChange({ ...box, rotation: deg });
            }}
          />
          <span
            aria-hidden
            title={t("resize")}
            onPointerDown={begin("resize")}
            onPointerMove={move}
            onPointerUp={end}
            className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-sm border-2 border-vranec bg-surface"
          />
        </>
      )}
    </div>
  );
}

function ItemForm({ eventId, item, onDone }: { eventId: string; item: FloorItemRow | null; onDone: () => void }) {
  const t = useTranslations("plan.seating");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [kind, setKind] = useState<FloorItemKind>(item?.kind ?? "DANCE_FLOOR");
  const [name, setName] = useState(item?.name ?? t("items.DANCE_FLOOR"));
  const [touched, setTouched] = useState(!!item);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const p = `item-${item?.id ?? "new"}`;
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveFloorItemAction(eventId, item?.id ?? null, { kind, name });
          if (res.ok) onDone();
          else setError(te(res.fieldErrors?.name ?? (res.formError && res.formError !== "emailTaken" ? res.formError : "generic")));
        });
      }}
    >
      <div className={cn("grid gap-3", item ? "" : "sm:grid-cols-2")}>
        {!item && (
          <Field id={`${p}-kind`} label={t("itemKind")}>
            <Select
              id={`${p}-kind`}
              value={kind}
              onChange={(e) => {
                const k = e.target.value as FloorItemKind;
                setKind(k);
                // Keep the name in step with the kind until the user types their own.
                if (!touched) setName(k === "LABEL" ? "" : t(`items.${k}`));
              }}
            >
              {FLOOR_ITEM_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`items.${k}`)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id={`${p}-name`} label={t("itemName")} error={error ?? undefined}>
          <Input
            id={`${p}-name`}
            value={name}
            placeholder={kind === "LABEL" ? t("labelPlaceholder") : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setTouched(true);
            }}
            autoFocus
          />
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

type PickChoice = { type: "table"; shape: TableShape } | { type: "item"; kind: FloorItemKind };

/** Small drawings for the picker tiles, in a 64×40 box. */
function PickerArt({ choice }: { choice: PickChoice }) {
  const chair = (cx: number, cy: number, k: number) => <circle key={k} cx={cx} cy={cy} r={3.2} />;
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 64 40" className="h-10 w-16" {...stroke}>
      {children}
    </svg>
  );
  const ring = (cx: number, rx: number, ry: number, n: number) =>
    Array.from({ length: n }, (_, i) => chair(cx + rx * Math.cos((i * 2 * Math.PI) / n), 20 + ry * Math.sin((i * 2 * Math.PI) / n), i));
  if (choice.type === "table") {
    switch (choice.shape) {
      case "ROUND":
        return svg(<><circle cx={32} cy={20} r={10} />{ring(32, 15.5, 15.5, 8)}</>);
      case "ELLIPSE":
        return svg(<><ellipse cx={32} cy={20} rx={15} ry={8} />{ring(32, 21, 14, 10)}</>);
      case "SQUARE":
        return svg(<><rect x={22} y={10} width={20} height={20} rx={2} />{[chair(32, 4, 0), chair(32, 36, 1), chair(16, 20, 2), chair(48, 20, 3)]}</>);
      case "HALF_ROUND":
        return svg(<><path d="M14 10 H50 A18 18 0 0 1 14 10 Z" />{[0.15, 0.38, 0.62, 0.85].map((f, i) => chair(32 + 24 * Math.cos(f * Math.PI), 10 + 24 * Math.sin(f * Math.PI), i))}</>);
      case "ROW":
        return svg([12, 22, 32, 42, 52].map((x, i) => chair(x, 20, i)));
      case "HEAD":
        return svg(<><rect x={8} y={20} width={48} height={11} rx={2} />{[14, 23, 32, 41, 50].map((x, i) => chair(x, 13, i))}</>);
      default:
        return svg(<><rect x={10} y={14} width={44} height={12} rx={2} />{[16, 26, 38, 48].flatMap((x, i) => [chair(x, 7, i), chair(x, 33, i + 10)])}</>);
    }
  }
  const look = FLOOR_ITEM_LOOK[choice.kind];
  if (look === "icon") return <FloorIcon kind={choice.kind} className="h-11 w-14" />;
  const dashed = { strokeDasharray: "3 3" };
  switch (look) {
    case "round":
      return svg(<circle cx={32} cy={20} r={16} {...dashed} />);
    case "half":
      return svg(<path d="M10 34 A22 22 0 0 1 54 34 Z" {...dashed} />);
    case "buffet":
      return svg(<rect x={8} y={14} width={48} height={12} rx={2} />);
    case "buffetRound":
      return svg(<circle cx={32} cy={20} r={12} />);
    case "wall":
      return svg(<rect x={6} y={18} width={52} height={4} fill="currentColor" />);
    case "pillar":
      return svg(<rect x={26} y={14} width={12} height={12} fill="currentColor" />);
    default:
      return svg(<rect x={8} y={6} width={48} height={28} rx={4} {...(choice.kind === "BAND" ? {} : dashed)} />);
  }
}

/** "Add element" picker (decision 128): a grid of pictures; a click adds that table or element. */
function AddPicker({ onPick, onClose }: { onPick: (c: PickChoice) => void; onClose: () => void }) {
  const t = useTranslations("plan.seating");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const items = (kinds: FloorItemKind[]): PickChoice[] => kinds.map((kind) => ({ type: "item", kind }));
  const groups: { title: string; choices: PickChoice[] }[] = [
    { title: t("pickTables"), choices: TABLE_SHAPES.map((shape) => ({ type: "table", shape })) },
    { title: t("pickBuffet"), choices: items(["BUFFET_LONG", "BUFFET_ROUND"]) },
    { title: t("pickAreas"), choices: items(["DANCE_FLOOR", "DANCE_FLOOR_ROUND", "STAGE", "BAND", "TENT", "LABEL"]) },
    { title: t("pickStructure"), choices: items(["WALL", "DOOR", "PILLAR", "ENTRANCE"]) },
    { title: t("pickServices"), choices: items(["WC", "BAR", "CAKE", "GIFTS", "PHOTO", "KIDS", "HIGH_CHAIR"]) },
    { title: t("pickMusic"), choices: items(["DJ", "SPEAKER", "MIC", "LIGHT", "LASER", "FIREWORK", "SMOKE", "PIANO", "GRAND_PIANO"]) },
    { title: t("pickNature"), choices: items(["TREE_ROUND", "TREE_CLOUD", "TREE_TALL", "TREE_PINE", "TREE_LEAF", "HEDGE", "HEDGE_ROW", "ARCH", "WATER"]) },
    { title: t("pickSigns"), choices: items(["FAN", "AIR_CON", "HEATER", "ACCESSIBLE", "CAUTION", "COMPASS", "TARGET"]) },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("addElement")}
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-card)] bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t("addElement")}</h2>
          <Button variant="ghost" size="sm" aria-label={t("closePicker")} onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        {groups.map((g) => (
          <section key={g.title} className="mt-5">
            <h3 className="border-b border-line pb-1.5 text-sm font-medium text-ink-soft">{g.title}</h3>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {g.choices.map((c) => {
                const label = c.type === "table" ? t(`shapes.${c.shape}`) : t(`items.${c.kind}`);
                return (
                  <li key={c.type === "table" ? c.shape : c.kind}>
                    <button
                      type="button"
                      onClick={() => onPick(c)}
                      className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-linen/50 text-ink-soft transition-colors hover:border-vranec/50 hover:bg-rosehip/60 hover:text-vranec"
                    >
                      <PickerArt choice={c} />
                      <span className="px-1 text-xs leading-tight">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
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
