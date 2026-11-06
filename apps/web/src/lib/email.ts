import "server-only";
import { messages } from "@svadba/i18n";
import { isLocale, type Locale } from "@svadba/shared";
import { createTranslator } from "next-intl";
import { Resend } from "resend";
import { env } from "./env";

type EmailKind = "verify" | "reset" | "approved" | "rejected" | "deletion" | "erasure";

const KEYS = {
  verify: { subject: "verifySubject", text: "verifyText", button: "verifyButton" },
  reset: { subject: "resetSubject", text: "resetText", button: "resetButton" },
  approved: { subject: "approvedSubject", text: "approvedText", button: "approvedButton" },
  rejected: { subject: "rejectedSubject", text: "rejectedText", button: "rejectedButton" },
  deletion: { subject: "deletionSubject", text: "deletionText", button: "deletionButton" },
  erasure: { subject: "erasureSubject", text: "erasureText", button: "erasureButton" },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Shared HTML layout for every email. */
function layout(locale: Locale, parts: { greeting: string; text: string; button: string; url: string; footer: string }) {
  const appName = messages[locale].common.appName;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#FAF8F5;font-family:Arial,Helvetica,sans-serif;color:#231A1D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #E8E1DA;border-radius:12px">
<tr><td style="padding:32px 32px 8px;font-family:Georgia,serif;font-size:22px;color:#7A1F33">${escapeHtml(appName)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:16px;line-height:24px">${escapeHtml(parts.greeting)}</td></tr>
<tr><td style="padding:12px 32px 24px;font-size:16px;line-height:24px;white-space:pre-line">${escapeHtml(parts.text)}</td></tr>
<tr><td style="padding:0 32px 28px"><a href="${escapeHtml(parts.url)}" style="display:inline-block;background:#7A1F33;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px">${escapeHtml(parts.button)}</a></td></tr>
<tr><td style="padding:0 32px 32px;font-size:13px;line-height:20px;color:#7D716C">${escapeHtml(parts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { html, text: `${parts.greeting}\n\n${parts.text}\n\n${parts.url}\n\n${parts.footer}` };
}

function renderEmail(
  locale: Locale,
  kind: EmailKind,
  name: string,
  url: string,
  values: { business?: string; reason?: string; date?: string; couple?: string },
) {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "email" });
  const k = KEYS[kind];
  const subject = t(k.subject);
  const body = layout(locale, {
    greeting: t("greeting", { name }),
    text: t(k.text, {
      business: values.business ?? "",
      reason: values.reason ?? "",
      date: values.date ?? "",
      couple: values.couple ?? "",
    }),
    button: t(k.button),
    url,
    footer: t(kind === "erasure" ? "erasureFooter" : "ignore"),
  });
  return { subject, ...body };
}

let resend: Resend | null = null;

/** Sends an email in the user's language. Without RESEND_API_KEY it prints to the console. */
export async function sendAuthEmail(opts: {
  to: string;
  name: string;
  locale: unknown;
  kind: EmailKind;
  url: string;
  business?: string;
  reason?: string;
  date?: string;
  couple?: string;
}) {
  const locale = isLocale(opts.locale) ? opts.locale : "mk";
  const { subject, html, text } = renderEmail(locale, opts.kind, opts.name, opts.url, opts);
  await deliver(opts.to, subject, html, text, opts.url);
}

async function deliver(to: string, subject: string, html: string, text: string, url: string) {
  if (!env.resendKey) {
    console.log(`\n[email:dev] to=${to} subject="${subject}"\n[email:dev] link: ${url}\n`);
    return;
  }
  resend ??= new Resend(env.resendKey);
  const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html, text });
  if (error) console.error("[email] send failed", error);
}

/** Email copy of a bell notification; subject and text are already translated by the caller. */
export async function sendNotificationEmail(opts: {
  to: string;
  name: string;
  locale: Locale;
  subject: string;
  text: string;
  url: string;
}) {
  const t = createTranslator({ locale: opts.locale, messages: messages[opts.locale], namespace: "email" });
  const { html, text } = layout(opts.locale, {
    greeting: t("greeting", { name: opts.name }),
    text: opts.text,
    button: t("notificationButton"),
    url: opts.url,
    footer: t("notificationFooter"),
  });
  await deliver(opts.to, opts.subject, html, text, opts.url);
}
