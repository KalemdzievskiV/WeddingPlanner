import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InvitationCard } from "@/components/plan/invitation-card";
import { InviteEditor } from "@/components/plan/invite-editor";
import { formatDate } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.invite"))("title") };
}

/** Video invitation editor: the video, the words in front of it and a live preview. */
export default async function InvitationPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const te = await getTranslations("plan.events");
  const [events, household] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
    // Any family's link, so the couple can open the invitation the way guests see it.
    prisma.household.findFirst({ where: { weddingId: wedding.id }, orderBy: { createdAt: "asc" }, select: { rsvpToken: true } }),
  ]);

  return (
    <div className="space-y-6">
      <InviteEditor
        editable={canEdit(role)}
        partner1={wedding.partner1}
        partner2={wedding.partner2}
        dateLabel={wedding.date ? formatDate(wedding.date) : ""}
        previewHref={household ? `/rsvp/${household.rsvpToken}` : null}
        events={events.map((e) => ({ id: e.id, name: eventName(e, te), when: [e.time ?? "", e.place ?? ""].filter(Boolean).join(" · ") }))}
        initial={{
          enabled: wedding.inviteEnabled,
          videoUrl: wedding.inviteVideoUrl ?? "",
          headline: wedding.inviteHeadline ?? "",
          message: wedding.inviteMessage ?? "",
          overlay: wedding.inviteOverlay,
          eventIds: wedding.inviteEventIds,
        }}
      />
      <InvitationCard url={wedding.invitationUrl} editable={canEdit(role)} />
    </div>
  );
}
