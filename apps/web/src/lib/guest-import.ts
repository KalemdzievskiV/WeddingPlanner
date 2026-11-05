import type { AgeGroup, GuestSide } from "@svadba/shared";

export type ImportRow = { household: string; side: GuestSide; guests: { name: string; ageGroup: AgeGroup }[] };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Pasted list: one family per line, "Family: name, name". A line without a colon is one person.
 * Side and age come from the batch settings.
 */
export function parsePasted(text: string, side: GuestSide, ageGroup: AgeGroup): ImportRow[] {
  const rows: ImportRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = clean(raw);
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      rows.push({ household: line.slice(0, 80), side, guests: [{ name: line.slice(0, 80), ageGroup }] });
      continue;
    }
    const household = clean(line.slice(0, colon)).slice(0, 80);
    const names = line
      .slice(colon + 1)
      .split(/[,;]/)
      .map(clean)
      .filter(Boolean)
      .map((n) => n.slice(0, 80));
    if (!household && names.length === 0) continue;
    rows.push({
      household: household || names[0]!,
      side,
      guests: (names.length ? names : [household]).map((name) => ({ name, ageGroup })),
    });
  }
  return rows;
}

/** Minimal CSV parser: quotes, "" escapes, and comma or semicolon (Excel in Macedonia uses ;). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const SIDE_WORDS: [RegExp, GuestSide][] = [
  [/^(невест|bride|nus|b$|н$)/i, "BRIDE"],
  [/^(младоженец|groom|dhënd|dhend|g$|м$)/i, "GROOM"],
  [/^(заеднич|both|të dy|te dy|dy|з$)/i, "BOTH"],
];
const AGE_WORDS: [RegExp, AgeGroup][] = [
  [/^(дете|деца|child|kid|fëmij|femij)/i, "CHILD"],
  [/^(млад|young|i ri|e re|rin)/i, "YOUNG"],
  [/^(постар|стар|older|old|senior|i moshuar|e moshuar)/i, "OLDER"],
  [/^(возрас|adult|i rritur|e rritur)/i, "ADULT"],
];
const HEADER = /^(family|семејство|familja|familje)/i;

/** Spreadsheet rows (family, name, side, age) → one entry per family. */
export function parseTable(table: (string | number | boolean | null | undefined)[][], fallbackSide: GuestSide): ImportRow[] {
  const byFamily = new Map<string, ImportRow>();
  for (const [i, cells] of table.entries()) {
    const [family, name, side, age] = cells.map((c) => clean(String(c ?? "")));
    if (i === 0 && family && HEADER.test(family)) continue;
    if (!family && !name) continue;
    const key = (family || name)!.slice(0, 80);
    const s = SIDE_WORDS.find(([re]) => re.test(side ?? ""))?.[1] ?? fallbackSide;
    const a = AGE_WORDS.find(([re]) => re.test(age ?? ""))?.[1] ?? "ADULT";
    const row = byFamily.get(key) ?? { household: key, side: s, guests: [] };
    row.guests.push({ name: (name || family)!.slice(0, 80), ageGroup: a });
    byFamily.set(key, row);
  }
  return [...byFamily.values()];
}

/** CSV template with localized headers; BOM so Excel opens Cyrillic correctly. */
export function templateCsv(headers: string[], example: string[][]) {
  const line = (cells: string[]) => cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
  return "﻿" + [line(headers), ...example.map(line)].join("\r\n") + "\r\n";
}
