import type { Locale } from "@svadba/shared";

/**
 * A legal document in all three languages.
 *
 * Text format (kept simple on purpose):
 * - a line starting with "## " is a section heading; add `{#id}` at the end to link to it, e.g. "## Cookies {#cookies}"
 * - a line starting with "- " is a list item
 * - other lines are paragraphs; a blank line separates them
 */
export type LegalDoc = {
  /** True while the text is a placeholder: the page shows a "draft" notice. Set to false when the final text is in. */
  draft: boolean;
  /** Date the text last changed, "YYYY-MM-DD", or null while it is a draft. */
  updated: string | null;
  body: Record<Locale, string>;
};
