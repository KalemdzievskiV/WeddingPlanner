"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { submitRsvpAction } from "@/actions/plan-guests";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Answer = "YES" | "NO";

export function RsvpForm({
  token,
  guests,
  events,
  initial,
  initialNote,
  answered,
}: {
  token: string;
  guests: { id: string; name: string; eventIds: string[] }[];
  events: { id: string; name: string; when: string }[];
  initial: Record<string, Answer>;
  initialNote: string;
  answered: boolean;
}) {
  const t = useTranslations("rsvp");
  const te = useTranslations("errors");
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial);
  const [note, setNote] = useState(initialNote);
  const [done, setDone] = useState(answered);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needed = guests.flatMap((g) => g.eventIds.map((e) => `${g.id}:${e}`));
  const complete = needed.every((k) => answers[k]);

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <Alert tone="success">{t("thanks")}</Alert>
        <Button variant="secondary" onClick={() => setDone(false)}>
          {t("change")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!complete) return setError(t("answerAll"));
        start(async () => {
          const res = await submitRsvpAction(token, {
            answers: Object.entries(answers).map(([k, rsvp]) => {
              const [guestId, eventId] = k.split(":");
              return { guestId, eventId, rsvp };
            }),
            note,
          });
          if (res.ok) {
            setDone(true);
            setError(null);
          } else setError(te(res.formError && res.formError !== "emailTaken" ? res.formError : "generic"));
        });
      }}
    >
      {events.map((ev) => (
        <section key={ev.id}>
          <h2 className="font-display text-xl">{ev.name}</h2>
          {ev.when && <p className="text-sm text-stone">{ev.when}</p>}
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {guests
              .filter((g) => g.eventIds.includes(ev.id))
              .map((g) => {
                const key = `${g.id}:${ev.id}`;
                return (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="font-medium">{g.name}</span>
                    <span role="radiogroup" aria-label={g.name} className="flex gap-2">
                      {(["YES", "NO"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={answers[key] === v}
                          onClick={() => setAnswers((a) => ({ ...a, [key]: v }))}
                          className={cn(
                            "h-10 rounded-lg border px-4 text-sm font-medium transition-colors",
                            answers[key] === v
                              ? v === "YES"
                                ? "border-olive bg-olive text-white"
                                : "border-danger bg-danger text-white"
                              : "border-line-strong bg-surface text-ink-soft hover:border-ink-soft/50",
                          )}
                        >
                          {v === "YES" ? t("coming") : t("notComing")}
                        </button>
                      ))}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <Field id="rsvp-note" label={t("note")}>
        <textarea
          id="rsvp-note"
          rows={3}
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
        />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
