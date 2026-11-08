"use client";

import { GUEST_ROLES, ROLE_SIDE, type GuestRole, type GuestSide } from "@svadba/shared";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { startPlanAction } from "@/actions/plan-guests";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { ErrorKey } from "@/lib/form";
import { parsePasted } from "@/lib/guest-import";

type Line = { key: number; text: string };
type Lines = Record<GuestSide, Line[]>;

const countLine = (text: string) => parsePasted(text, "BOTH", "ADULT").reduce((n, r) => n + r.guests.length, 0);

/** First step of a new plan (decision 100): wedding party + first guests, bride's side vs groom's side. */
export function PlanStart({ locale, bride, groom }: { locale: string; bride: string; groom: string }) {
  const t = useTranslations("plan.start");
  const tg = useTranslations("plan.guests");
  const te = useTranslations("errors");
  const [party, setParty] = useState<Record<GuestRole, string>>(() => ({
    ...(Object.fromEntries(GUEST_ROLES.map((r) => [r, ""])) as Record<GuestRole, string>),
    BRIDE: bride,
    GROOM: groom,
  }));
  const nextKey = useRef(3);
  const [lines, setLines] = useState<Lines>({
    BRIDE: [{ key: 0, text: "" }],
    GROOM: [{ key: 1, text: "" }],
    BOTH: [{ key: 2, text: "" }],
  });
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  const filledParty = GUEST_ROLES.filter((r) => party[r].trim());
  const guestsOn = (side: GuestSide) => lines[side].reduce((n, l) => n + countLine(l.text), 0);
  const sideTotal = (side: "BRIDE" | "GROOM") => filledParty.filter((r) => ROLE_SIDE[r] === side).length + guestsOn(side);
  const guestCount = guestsOn("BRIDE") + guestsOn("GROOM") + guestsOn("BOTH");

  function addLine(side: GuestSide) {
    const key = nextKey.current++;
    // Render the row now so it can take focus (Enter / "+ Add guest" keeps typing flowing).
    flushSync(() => setLines((ls) => ({ ...ls, [side]: [...ls[side], { key, text: "" }] })));
    document.getElementById(`start-line-${key}`)?.focus();
  }
  const setLine = (side: GuestSide, key: number, text: string) =>
    setLines((ls) => ({ ...ls, [side]: ls[side].map((l) => (l.key === key ? { ...l, text } : l)) }));
  const removeLine = (side: GuestSide, key: number) =>
    setLines((ls) => ({ ...ls, [side]: ls[side].filter((l) => l.key !== key) }));

  function submit() {
    setError(null);
    const payload = {
      party: filledParty.map((role) => ({ role, name: party[role].trim() })),
      lines: (Object.keys(lines) as GuestSide[]).flatMap((side) =>
        lines[side].filter((l) => l.text.trim()).map((l) => ({ side, text: l.text.trim() })),
      ),
    };
    start(async () => {
      const res = await startPlanAction(locale, payload);
      const key = res.formError === "emailTaken" ? "generic" : res.formError;
      if (key) setError(key);
    });
  }

  const guestRows = (side: GuestSide) => (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-stone">{t("guests")}</h3>
      <ul className="mt-2 space-y-2">
        {lines[side].map((l, i) => (
          <li key={l.key} className="flex items-center gap-1.5">
            <Input
              aria-label={`${t("guests")} ${i + 1}`}
              value={l.text}
              placeholder={t(side === "BRIDE" ? "placeholderBride" : side === "GROOM" ? "placeholderGroom" : "placeholderBoth")}
              id={`start-line-${l.key}`}
              onChange={(e) => setLine(side, l.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLine(side);
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t("removeRow")}
              disabled={lines[side].length === 1 && !l.text}
              onClick={() => (lines[side].length === 1 ? setLine(side, l.key, "") : removeLine(side, l.key))}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => addLine(side)}>
        <Plus aria-hidden className="size-4" /> {t("addGuest")}
      </Button>
    </div>
  );

  const column = (side: "BRIDE" | "GROOM") => (
    <section aria-labelledby={`start-${side}`} className="space-y-6 p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`start-${side}`} className="font-display text-2xl">
          {t(side === "BRIDE" ? "brideSide" : "groomSide")}
        </h2>
        <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-stone">{t("people", { count: sideTotal(side) })}</span>
      </div>
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone">{t("party")}</h3>
        <div className="mt-2 space-y-3">
          {GUEST_ROLES.filter((r) => ROLE_SIDE[r] === side).map((role) => (
            <label key={role} className="block">
              <span className="text-sm text-ink-soft">{tg(`roles.${role}`)}</span>
              <Input
                className="mt-1"
                value={party[role]}
                maxLength={80}
                onChange={(e) => setParty((p) => ({ ...p, [role]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </div>
      {guestRows(side)}
    </section>
  );

  return (
    <div className="mt-8 space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
          {column("BRIDE")}
          {column("GROOM")}
        </div>
        <section aria-labelledby="start-BOTH" className="space-y-3 border-t border-line bg-linen/50 p-5 sm:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="start-BOTH" className="font-display text-xl">
              {t("bothSides")}
            </h2>
            <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-stone">{t("people", { count: guestsOn("BOTH") })}</span>
          </div>
          <div className="max-w-md">{guestRows("BOTH")}</div>
        </section>
      </Card>

      <p className="text-center text-sm text-stone">{t("hint")}</p>

      <div className="text-center">
        <p className="text-sm text-stone">{t("ratio")}</p>
        <p className="mt-1 text-5xl font-light tabular-nums">
          {sideTotal("BRIDE")} : {sideTotal("GROOM")}
        </p>
        <p className="mt-3 tabular-nums text-ink-soft">
          {t("summary", { party: filledParty.length, guests: guestCount, total: filledParty.length + guestCount })}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {te(error)}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Link href="/plan" className={buttonClass("ghost")}>
          {t("skip")}
        </Link>
      </div>
    </div>
  );
}
