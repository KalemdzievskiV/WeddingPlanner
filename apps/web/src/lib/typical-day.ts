import "server-only";
import { prisma } from "@svadba/db";
import { LOCALES, TYPICAL_DAY, TYPICAL_DAY_START, type EventType, type GuestRole, type GuestSide } from "@svadba/shared";
import { getTranslations } from "next-intl/server";

export type TypicalDayStep = {
  titleMk: string;
  titleSq: string | null;
  titleEn: string | null;
  durationMin: number;
  eventType: EventType | null;
  forAll: boolean;
  forSides: GuestSide[];
  forRoles: GuestRole[];
};
/** `version` changes on every save or reset ("builtin" while nothing is saved). */
export type TypicalDay = { startTime: string; steps: TypicalDayStep[]; custom: boolean; version: string };

/** The built-in template (decision 107), with titles from the translations. */
export async function builtInTypicalDay(): Promise<TypicalDay> {
  const ts = await Promise.all(LOCALES.map((locale) => getTranslations({ locale, namespace: "plan.schedule.typical" })));
  const [mk, sq, en] = ts.map((t) => (key: string) => t(key as Parameters<typeof t>[0]));
  return {
    startTime: TYPICAL_DAY_START,
    custom: false,
    version: "builtin",
    steps: TYPICAL_DAY.map((s) => ({
      titleMk: mk!(s.key),
      titleSq: sq!(s.key),
      titleEn: en!(s.key),
      durationMin: s.durationMin,
      eventType: s.eventType ?? null,
      forAll: s.forAll ?? false,
      forSides: s.forSides ?? [],
      forRoles: s.forRoles ?? [],
    })),
  };
}

/** The admin-edited template (decision 111), or the built-in one while nothing is saved. */
export async function getTypicalDay(): Promise<TypicalDay> {
  const row = await prisma.typicalDayTemplate.findUnique({
    where: { id: "default" },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row || row.steps.length === 0) return builtInTypicalDay();
  return {
    startTime: row.startTime,
    custom: true,
    version: row.updatedAt.toISOString(),
    steps: row.steps.map(({ titleMk, titleSq, titleEn, durationMin, eventType, forAll, forSides, forRoles }) => ({
      titleMk,
      titleSq,
      titleEn,
      durationMin,
      eventType,
      forAll,
      forSides,
      forRoles,
    })),
  };
}
