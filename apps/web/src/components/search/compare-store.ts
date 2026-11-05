"use client";

import { COMPARE_MAX, type VendorCategory } from "@svadba/shared";
import { useSyncExternalStore } from "react";

/** Vendors ticked for comparison, kept in this browser only (decision 83). One category at a time. */
type CompareState = { category: VendorCategory | null; ids: string[] };

const KEY = "svadba.compare";
const EMPTY: CompareState = { category: null, ids: [] };
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CompareState } = { raw: null, value: EMPTY };

function read(): CompareState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.ids)) value = { category: parsed.category ?? null, ids: parsed.ids.slice(0, COMPARE_MAX) };
  } catch {}
  cache = { raw, value };
  return value;
}

function write(value: CompareState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCompare() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    ...state,
    has: (id: string) => state.ids.includes(id),
    full: state.ids.length >= COMPARE_MAX,
    /** Ticking a vendor from another category starts a new comparison. */
    toggle(id: string, category: VendorCategory) {
      const current = read();
      if (current.category !== category) return write({ category, ids: [id] });
      if (current.ids.includes(id)) return write({ category, ids: current.ids.filter((x) => x !== id) });
      if (current.ids.length >= COMPARE_MAX) return;
      write({ category, ids: [...current.ids, id] });
    },
    clear: () => write(EMPTY),
  };
}
