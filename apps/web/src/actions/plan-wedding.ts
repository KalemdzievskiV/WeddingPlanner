"use server";

import { prisma } from "@svadba/db";
import {
  eventSchema,
  INVITE_LINK_DAYS,
  INVITE_ROLES,
  isLocale,
  pickLocalized,
  weddingSchema,
  type InviteRole,
} from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newToken } from "@/lib/business";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";
import { ensureCouple, ensureCoupleSeated, fillHeadTable } from "@/lib/head-table";
import { deleteImage } from "@/lib/storage";
import { canManage, editableWedding, getWeddingAccess } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

function readWedding(fd: FormData) {
  return weddingSchema.safeParse({
    partner1: fd.get("partner1") ?? "",
    partner2: fd.get("partner2") ?? "",
    date: fd.get("date") ?? "",
    cityId: fd.get("cityId") ?? "",
    estimatedGuests: fd.get("estimatedGuests") ?? "",
    budgetTotal: fd.get("budgetTotal") ?? "",
    currency: fd.get("currency") ?? "EUR",
  });
}

/** Setup wizard: creates the wedding with the reception, default budget categories and checklist. */
export async function createWeddingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const locale = fd.get("locale");
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  if (await prisma.weddingMember.findUnique({ where: { userId: user.id } })) redirect(`/${locale}/plan`);

  const parsed = readWedding(fd);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.cityId && !(await prisma.city.findUnique({ where: { id: data.cityId } }))) data.cityId = null;

  const [categories, tasks] = await Promise.all([
    prisma.budgetTemplateCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.checklistTemplateItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const wedding = await prisma.wedding.create({
    include: { events: { select: { id: true } } },
    data: {
      ...data,
      members: { create: { userId: user.id, role: "OWNER" } },
      // Groom's home → bride's home → reception (decision 103).
      events: {
        create: [
          { type: "GROOM_HOME", date: data.date, sortOrder: 0 },
          { type: "BRIDE_HOME", date: data.date, sortOrder: 1 },
          { type: "RECEPTION", date: data.date, hasSeating: true, sortOrder: 2 },
        ],
      },
      budgetCategories: {
        create: categories.map((c, i) => ({ name: pickLocalized(c, "name", locale), slug: c.slug, sortOrder: i })),
      },
      tasks: {
        create: tasks.map((t, i) => ({
          title: pickLocalized(t, "title", locale),
          monthsBefore: t.monthsBefore,
          templateSlug: t.slug,
          sortOrder: i,
        })),
      },
    },
  });
  // The couple are guests from the start (decision 101): seated at the head table, counted for the venue.
  const invitations = { create: wedding.events.map((e) => ({ eventId: e.id })) };
  for (const [role, name] of [["BRIDE", data.partner1], ["GROOM", data.partner2]] as const) {
    await prisma.household.create({
      data: {
        weddingId: wedding.id,
        name,
        side: role,
        rsvpToken: newToken(),
        guests: { create: { weddingId: wedding.id, name, role, invitations } },
      },
    });
  }
  await ensureCouple(wedding.id);
  await fillHeadTable(wedding.id, { create: true, locale });
  if (!user.roles.includes("COUPLE")) {
    await prisma.user.update({ where: { id: user.id }, data: { roles: { push: "COUPLE" } } });
  }
  refresh();
  // First step: wedding party and first guests by side (decision 100).
  redirect(`/${locale}/plan/start`);
}

export async function updateWeddingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const access = await getWeddingAccess();
  if (!access || !canManage(access.role)) return { formError: "forbidden" };
  const parsed = readWedding(fd);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const old = access.wedding;
  await prisma.$transaction([
    prisma.wedding.update({ where: { id: old.id }, data: parsed.data }),
    // Keep the reception and home events on the wedding day unless the couple gave them their own date.
    prisma.weddingEvent.updateMany({
      where: { weddingId: old.id, type: { in: ["RECEPTION", "GROOM_HOME", "BRIDE_HOME"] }, OR: [{ date: null }, { date: old.date ?? undefined }] },
      data: { date: parsed.data.date },
    }),
  ]);
  refresh();
  return { ok: true };
}

export async function deleteWeddingAction(locale: string): Promise<FormState> {
  const access = await getWeddingAccess();
  if (!access || access.role !== "OWNER" || !isLocale(locale)) return { formError: "forbidden" };
  await prisma.wedding.delete({ where: { id: access.wedding.id } });
  if (access.wedding.invitationUrl) await deleteImage(access.wedding.invitationUrl);
  refresh();
  redirect(`/${locale}/app`);
}

// ─── Events ───

export async function saveEventAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = eventSchema.safeParse({
    type: fd.get("type"),
    name: fd.get("name") ?? "",
    date: fd.get("date") ?? "",
    time: fd.get("time") ?? "",
    place: fd.get("place") ?? "",
    lat: fd.get("lat") ?? "",
    lng: fd.get("lng") ?? "",
    hasSeating: fd.get("hasSeating") === "on",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.type === "CUSTOM" && !parsed.data.name) return { fieldErrors: { name: "required" } };
  const weddingId = access.wedding.id;
  if (id) {
    const { count } = await prisma.weddingEvent.updateMany({ where: { id, weddingId }, data: parsed.data });
    if (!count) return { formError: "generic" };
  } else {
    const sortOrder = await prisma.weddingEvent.count({ where: { weddingId } });
    await prisma.weddingEvent.create({ data: { ...parsed.data, weddingId, sortOrder } });
  }
  // The couple is invited to every event, and seated where a head table exists (decision 121).
  await ensureCoupleSeated(weddingId);
  refresh();
  return { ok: true };
}

export async function deleteEventAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  if ((await prisma.weddingEvent.count({ where: { weddingId } })) <= 1) return { formError: "lastEvent" };
  await prisma.weddingEvent.deleteMany({ where: { id, weddingId } });
  refresh();
  return { ok: true };
}

/** Saves a new order for the wedding's events (settings list, overview and everywhere events are listed). */
export async function reorderEventsAction(ids: string[]): Promise<FormState> {
  const access = await editableWedding();
  if (!access || !Array.isArray(ids)) return { formError: "forbidden" };
  const events = await prisma.weddingEvent.findMany({ where: { weddingId: access.wedding.id }, select: { id: true } });
  const known = new Set(events.map((e) => e.id));
  const order = ids.filter((id) => known.has(id));
  if (order.length !== known.size || new Set(order).size !== order.length) return { formError: "generic" };
  await prisma.$transaction(order.map((id, i) => prisma.weddingEvent.update({ where: { id }, data: { sortOrder: i } })));
  refresh();
  return { ok: true };
}

// ─── Members ───

export async function createWeddingInviteAction(role: InviteRole): Promise<FormState & { token?: string }> {
  const access = await getWeddingAccess();
  if (!access || !canManage(access.role) || !INVITE_ROLES.includes(role)) return { formError: "forbidden" };
  const token = newToken();
  await prisma.weddingInvite.create({
    data: { weddingId: access.wedding.id, token, role, expiresAt: new Date(Date.now() + INVITE_LINK_DAYS * 86_400_000) },
  });
  refresh();
  return { ok: true, token };
}

export async function revokeWeddingInviteAction(id: string): Promise<FormState> {
  const access = await getWeddingAccess();
  if (!access || !canManage(access.role)) return { formError: "forbidden" };
  await prisma.weddingInvite.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

export async function removeWeddingMemberAction(memberId: string): Promise<FormState> {
  const access = await getWeddingAccess();
  if (!access || !canManage(access.role)) return { formError: "forbidden" };
  await prisma.weddingMember.deleteMany({ where: { id: memberId, weddingId: access.wedding.id, role: { not: "OWNER" } } });
  refresh();
  return { ok: true };
}

/** Leave a wedding you were invited to. */
export async function leaveWeddingAction(locale: string): Promise<FormState> {
  const access = await getWeddingAccess();
  if (!access || access.role === "OWNER" || !isLocale(locale)) return { formError: "forbidden" };
  await prisma.weddingMember.delete({ where: { id: access.memberId } });
  refresh();
  redirect(`/${locale}/app`);
}

export async function joinWeddingAction(token: string, locale: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  const invite = await prisma.weddingInvite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date()) return { formError: "invalidLink" };
  const existing = await prisma.weddingMember.findUnique({ where: { userId: user.id } });
  if (existing && existing.weddingId !== invite.weddingId) return { formError: "alreadyInWedding" };
  await prisma.$transaction([
    ...(existing ? [] : [prisma.weddingMember.create({ data: { weddingId: invite.weddingId, userId: user.id, role: invite.role } })]),
    prisma.weddingInvite.delete({ where: { id: invite.id } }),
  ]);
  if (!user.roles.includes("COUPLE")) {
    await prisma.user.update({ where: { id: user.id }, data: { roles: { push: "COUPLE" } } });
  }
  refresh();
  redirect(`/${locale}/plan`);
}
