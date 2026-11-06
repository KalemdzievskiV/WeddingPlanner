import { SENTRY_DATA_COLLECTION } from "@/lib/sentry-privacy";

// Browser error tracking (decision 93). Loaded only when NEXT_PUBLIC_SENTRY_DSN is set at build time.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      dataCollection: SENTRY_DATA_COLLECTION,
    }),
  );
}
