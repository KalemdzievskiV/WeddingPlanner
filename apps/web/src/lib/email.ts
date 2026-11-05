import "server-only";
import { messages } from "@svadba/i18n";
import { isLocale, type Locale } from "@svadba/shared";
import { createTranslator } from "next-intl";
import { Resend } from "resend";
import { env } from "./env";

type EmailKind = "verify" | "reset" | "approved" | "rejected";

const KEYS = {
  verify: { subject: "verifySubject", text: "verifyText", button: "verifyButton" },
  reset: { subject: "resetSubject", text: "resetText", button: "resetButton" },
  approved: { subject: "approvedSubject", text: "approvedText", button: "approvedButton" },
  rejected: { subject: "rejectedSubject", text: "rejectedText", button: "rejectedButton" },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function renderEmail(
  locale: Locale,
  kind: EmailKind,
  name: string,
  url: string,
  values: { business?: string; reason?: string },
) {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "email" });
  const k = KEYS[kind];
  const subject = t(k.subject);
  const text = t(k.text, { business: values.business ?? "", reason: values.reason ?? "" });
  const button = t(k.button);
  const greeting = t("greeting", { name });
  const ignore = t("ignore");
  const appName = messages[locale].common.appName;

  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#FAF8F5;font-family:Arial,Helvetica,sans-serif;color:#231A1D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #E8E1DA;border-radius:12px">
<tr><td style="padding:32px 32px 8px;font-family:Georgia,serif;font-size:22px;color:#7A1F33">${escapeHtml(appName)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:16px;line-height:24px">${escapeHtml(greeting)}</td></tr>
<tr><td style="padding:12px 32px 24px;font-size:16px;line-height:24px">${escapeHtml(text)}</td></tr>
<tr><td style="padding:0 32px 28px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#7A1F33;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px">${escapeHtml(button)}</a></td></tr>
<tr><td style="padding:0 32px 32px;font-size:13px;line-height:20px;color:#7D716C">${escapeHtml(ignore)}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text: `${greeting}\n\n${text}\n\n${url}\n\n${ignore}` };
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
}) {
  const locale = isLocale(opts.locale) ? opts.locale : "mk";
  const { subject, html, text } = renderEmail(locale, opts.kind, opts.name, opts.url, opts);

  if (!env.resendKey) {
    console.log(`\n[email:dev] to=${opts.to} subject="${subject}"\n[email:dev] link: ${opts.url}\n`);
    return;
  }
  resend ??= new Resend(env.resendKey);
  const { error } = await resend.emails.send({ from: env.emailFrom, to: opts.to, subject, html, text });
  if (error) console.error("[email] send failed", error);
}
