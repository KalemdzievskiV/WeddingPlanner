/** Accepts only in-app paths like "/vendor/claim/abc" (no protocol, no "//host"). */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\r\n]/.test(value) || value.length > 300) return null;
  return value;
}
