/** Sends a caught browser error to Sentry when it's configured; otherwise logs it. */
export function reportError(error: unknown) {
  console.error(error);
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
}
