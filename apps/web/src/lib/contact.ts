/** Normalizes a Macedonian phone number to +389… for tel:, Viber and WhatsApp links. */
export function toInternational(phone: string) {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.startsWith("389") ? `+${digits}` : `+389${digits}`;
}

export const telLink = (phone: string) => `tel:${toInternational(phone)}`;
export const viberLink = (phone: string) => `viber://chat?number=${encodeURIComponent(toInternational(phone))}`;
export const whatsappLink = (phone: string) => `https://wa.me/${toInternational(phone).slice(1)}`;

/** Embeddable player URL for YouTube / Vimeo links; null for other sites (shown as a plain link). */
export function videoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    // not a URL
  }
  return null;
}
