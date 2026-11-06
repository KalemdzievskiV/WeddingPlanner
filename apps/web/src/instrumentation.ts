import type { Instrumentation } from "next";
import { SENTRY_DATA_COLLECTION } from "@/lib/sentry-privacy";

/**
 * Server error tracking (decision 93). Sentry loads only when SENTRY_DSN is set,
 * otherwise errors just go to the server log.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME !== "nodejs" && process.env.NEXT_RUNTIME !== "edge") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    dataCollection: SENTRY_DATA_COLLECTION,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
