import type { Messages } from "@svadba/i18n";
import type { ZodError } from "zod";

export type ErrorKey = keyof Messages["errors"];

/** Result returned by Server Actions to forms. Error values are keys in the "errors" namespace. */
export type FormState = {
  ok?: boolean;
  message?: string;
  formError?: ErrorKey | "emailTaken";
  fieldErrors?: Record<string, ErrorKey>;
};

export function zodFieldErrors(error: ZodError): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message as ErrorKey;
  }
  return out;
}
