import { INVITE_TRACKS } from "@svadba/shared";
import { dateInputValue } from "@/lib/format";

type EventLike = { date: Date | null; time: string | null; place: string | null };

/**
 * When the countdown on the invitation ends: the wedding date at the earliest event time that day
 * (events without a date count as that day), or noon when no time is set. Local wall-clock "YYYY-MM-DDTHH:MM".
 */
export function inviteCountdownTo(date: Date | null, events: EventLike[]): string | null {
  if (!date) return null;
  const day = dateInputValue(date);
  const times = events
    .filter((e) => !e.date || dateInputValue(e.date) === day)
    .map((e) => e.time?.trim() ?? "")
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => t.padStart(5, "0"))
    .sort();
  return `${day}T${times[0] ?? "12:00"}`;
}

/** The place under the names: the first shown event with an address, else the first invited one. */
export function inviteVenue(shown: EventLike[], invited: EventLike[]): string | null {
  return (shown.find((e) => e.place) ?? invited.find((e) => e.place))?.place ?? null;
}

/** Public path of a built-in track, or null when none (or an unknown id) is set. */
export function inviteTrackSrc(id: string | null): string | null {
  return id && INVITE_TRACKS.some((t) => t.id === id) ? `/music/${id}.mp3` : null;
}
