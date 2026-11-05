import type { Locale } from "@svadba/shared";
import en from "./messages/en.json";
import mk from "./messages/mk.json";
import sq from "./messages/sq.json";

/** English is the reference shape; every language must have the same keys. */
export type Messages = typeof en;

export const messages: Record<Locale, Messages> = { mk, sq, en };
