import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get authSecret() {
    // `next build` imports server modules without runtime secrets; the real value is required at runtime.
    if (process.env.NEXT_PHASE === "phase-production-build" && !process.env.BETTER_AUTH_SECRET) {
      return "build-time-placeholder-secret-never-used-for-requests";
    }
    return required("BETTER_AUTH_SECRET");
  },
  get appUrl() {
    return (process.env.BETTER_AUTH_URL ?? "http://localhost:3100").replace(/\/$/, "");
  },
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : null,
  resendKey: process.env.RESEND_API_KEY || null,
  /** Brevo's web API: works on hosts that block SMTP (Railway Hobby) and needs no domain, only a verified sender. */
  brevoKey: process.env.BREVO_API_KEY || null,
  /** Any SMTP server, e.g. Gmail with an app password. Used when RESEND_API_KEY is empty. */
  smtp:
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : null,
  emailFrom: process.env.EMAIL_FROM ?? "Svadba <no-reply@example.com>",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  r2:
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL
      ? {
          accountId: process.env.R2_ACCOUNT_ID,
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          bucket: process.env.R2_BUCKET,
          publicUrl: process.env.R2_PUBLIC_URL.replace(/\/$/, ""),
        }
      : null,
};

export const googleEnabled = env.google !== null;
