"use server";

import { prisma } from "@svadba/db";
import {
  bookSchema,
  inquirySchema,
  messageSchema,
  offerSchema,
  OPEN_INQUIRY_STATUSES,
  pickLocalized,
  type Locale,
} from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { getBusinessAccess } from "@/lib/business";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { businessTeam, excerpt, notify, weddingTeam } from "@/lib/notify";
import { coupleNames } from "@/lib/plan-helpers";
import { createVendorExpense, ensurePlannedVendor } from "@/lib/plan-vendors";
import { bumpStat } from "@/lib/stats";
import { editableWedding, getWeddingAccess } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");
const open = [...OPEN_INQUIRY_STATUSES];
const coupleLink = (id: string) => `/plan/inquiries/${id}`;
const vendorLink = (businessId: string, id: string) => `/vendor/${businessId}/inquiries/${id}`;

// ─── Couple side ───

/** New inquiry from a wedding to a vendor (decision 78). */
export async function createInquiryAction(
  businessId: string,
  locale: Locale,
  _prev: FormState & { id?: string },
  fd: FormData,
): Promise<FormState & { id?: string }> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const business = await prisma.business.findFirst({ where: { id: businessId, status: "APPROVED" } });
  if (!business) return { formError: "generic" };

  const parsed = inquirySchema.safeParse({
    eventId: fd.get("eventId") ?? "",
    date: fd.get("date") ?? "",
    guestCount: fd.get("guestCount") ?? "",
    hallId: fd.get("hallId") ?? "",
    packageRef: fd.get("packageRef") ?? "",
    message: fd.get("message") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  if (d.eventId && !(await prisma.weddingEvent.findFirst({ where: { id: d.eventId, weddingId } }))) return { formError: "generic" };
  if (d.hallId && !(await prisma.hall.findFirst({ where: { id: d.hallId, businessId } }))) return { formError: "generic" };
  let packageName: string | null = null;
  if (d.packageRef) {
    const [kind, id] = d.packageRef.split(":") as ["menu" | "package", string];
    const item =
      kind === "menu"
        ? await prisma.menuPackage.findFirst({ where: { id, businessId } })
        : await prisma.servicePackage.findFirst({ where: { id, businessId } });
    if (!item) return { formError: "generic" };
    packageName = pickLocalized(item, "name", locale);
  }

  const duplicate = await prisma.inquiry.findFirst({
    where: { weddingId, businessId, eventId: d.eventId, status: { in: open } },
    select: { id: true },
  });
  if (duplicate) return { formError: "inquiryOpen", id: duplicate.id };

  const now = new Date();
  const inquiry = await prisma.inquiry.create({
    data: {
      weddingId,
      businessId,
      eventId: d.eventId,
      hallId: d.hallId,
      packageRef: d.packageRef,
      packageName,
      date: d.date,
      guestCount: d.guestCount,
      createdById: access.user.id,
      lastMessageAt: now,
      coupleSeenAt: now,
      messages: { create: { authorId: access.user.id, fromVendor: false, text: d.message } },
    },
  });
  await bumpStat(businessId, "inquiries");
  await notify(
    await businessTeam(businessId, access.user.id),
    "INQUIRY_NEW",
    { couple: coupleNames(access.wedding), business: business.name, excerpt: excerpt(d.message) },
    vendorLink(businessId, inquiry.id),
  );
  refresh();
  return { ok: true, id: inquiry.id };
}

async function coupleInquiry(inquiryId: string) {
  const access = await editableWedding();
  if (!access || typeof inquiryId !== "string") return null;
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: inquiryId, weddingId: access.wedding.id },
    include: { business: true },
  });
  return inquiry ? { access, inquiry } : null;
}

export async function sendCoupleMessageAction(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await coupleInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (inquiry.status === "CANCELLED" || inquiry.status === "DECLINED") return { formError: "inquiryClosed" };
  const parsed = messageSchema.safeParse({ text: fd.get("text") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const now = new Date();
  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      lastMessageAt: now,
      coupleSeenAt: now,
      messages: { create: { authorId: access.user.id, fromVendor: false, text: parsed.data.text } },
    },
  });
  await notify(
    await businessTeam(inquiry.businessId, access.user.id),
    "INQUIRY_MESSAGE",
    { from: coupleNames(access.wedding), excerpt: excerpt(parsed.data.text) },
    vendorLink(inquiry.businessId, inquiry.id),
  );
  refresh();
  return { ok: true };
}

/** The couple withdraws an open inquiry. */
export async function cancelInquiryAction(inquiryId: string): Promise<FormState> {
  const ctx = await coupleInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (!open.includes(inquiry.status as (typeof open)[number])) return { formError: "inquiryClosed" };
  await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: "CANCELLED", lastMessageAt: new Date() } });
  await prisma.offer.updateMany({ where: { inquiryId: inquiry.id, status: "OPEN" }, data: { status: "DECLINED", respondedAt: new Date() } });
  await notify(
    await businessTeam(inquiry.businessId, access.user.id),
    "INQUIRY_CANCELLED",
    { couple: coupleNames(access.wedding), business: inquiry.business.name },
    vendorLink(inquiry.businessId, inquiry.id),
  );
  refresh();
  return { ok: true };
}

/**
 * Accept or decline the vendor's offer (decision 79).
 * Accepting can add it to the budget as a line linked to the vendor (added to the plan as "considering").
 */
export async function respondOfferAction(offerId: string, accept: boolean, addToBudget: boolean): Promise<FormState> {
  const access = await editableWedding();
  if (!access || typeof offerId !== "string") return { formError: "forbidden" };
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, inquiry: { weddingId: access.wedding.id } },
    include: { inquiry: { include: { business: true } } },
  });
  if (!offer || offer.status !== "OPEN") return { formError: "offerClosed" };
  const { inquiry } = offer;
  await prisma.offer.update({
    where: { id: offer.id },
    data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  if (accept && addToBudget) {
    const planned = await ensurePlannedVendor(access.wedding.id, inquiry.business, "CONSIDERING");
    await createVendorExpense({
      weddingId: access.wedding.id,
      business: inquiry.business,
      plannedVendorId: planned.id,
      name: inquiry.packageName,
      amount: offer.price,
      currency: offer.currency,
      perPerson: offer.unit === "PER_PERSON",
      eventId: inquiry.eventId,
      offerId: offer.id,
    });
  }
  await prisma.inquiry.update({ where: { id: inquiry.id }, data: { lastMessageAt: new Date(), coupleSeenAt: new Date() } });
  await notify(
    await businessTeam(inquiry.businessId, access.user.id),
    accept ? "OFFER_ACCEPTED" : "OFFER_DECLINED",
    { couple: coupleNames(access.wedding), business: inquiry.business.name },
    vendorLink(inquiry.businessId, inquiry.id),
  );
  refresh();
  return { ok: true };
}

// ─── Vendor side ───

async function vendorInquiry(inquiryId: string) {
  if (typeof inquiryId !== "string") return null;
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: { business: true, wedding: true },
  });
  if (!inquiry) return null;
  const access = await getBusinessAccess(inquiry.businessId);
  return access ? { access, inquiry } : null;
}

export async function sendVendorMessageAction(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (inquiry.status === "CANCELLED") return { formError: "inquiryClosed" };
  const parsed = messageSchema.safeParse({ text: fd.get("text") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const now = new Date();
  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      status: inquiry.status === "NEW" ? "REPLIED" : inquiry.status,
      lastMessageAt: now,
      vendorSeenAt: now,
      messages: { create: { authorId: access.user.id, fromVendor: true, text: parsed.data.text } },
    },
  });
  await notify(
    await weddingTeam(inquiry.weddingId, access.user.id),
    "INQUIRY_MESSAGE",
    { from: inquiry.business.name, excerpt: excerpt(parsed.data.text) },
    coupleLink(inquiry.id),
  );
  refresh();
  return { ok: true };
}

/** Priced offer; replaces any offer the couple hasn't answered yet. */
export async function sendOfferAction(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (!open.includes(inquiry.status as (typeof open)[number])) return { formError: "inquiryClosed" };
  const parsed = offerSchema.safeParse({
    price: fd.get("price") ?? "",
    unit: fd.get("unit") ?? "",
    currency: fd.get("currency") ?? "",
    validUntil: fd.get("validUntil") ?? "",
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const now = new Date();
  await prisma.offer.updateMany({ where: { inquiryId: inquiry.id, status: "OPEN" }, data: { status: "REPLACED" } });
  await prisma.offer.create({ data: { ...parsed.data, inquiryId: inquiry.id, authorId: access.user.id } });
  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { status: "OFFER_SENT", lastMessageAt: now, vendorSeenAt: now },
  });
  await notify(
    await weddingTeam(inquiry.weddingId, access.user.id),
    "OFFER_NEW",
    { business: inquiry.business.name, couple: coupleNames(inquiry.wedding), excerpt: parsed.data.note ?? undefined },
    coupleLink(inquiry.id),
  );
  refresh();
  return { ok: true };
}

/**
 * Deal agreed (decision 80): blocks the day (and hall) in the vendor's calendar,
 * adds the vendor to the couple's plan as booked, and adds the offer to their budget once.
 */
export async function bookInquiryAction(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (!open.includes(inquiry.status as (typeof open)[number])) return { formError: "inquiryClosed" };
  const parsed = bookSchema.safeParse({ date: fd.get("date") ?? "", hallId: fd.get("hallId") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { date, hallId } = parsed.data;

  const hallCount = await prisma.hall.count({ where: { businessId: inquiry.businessId } });
  if (hallCount > 0) {
    if (!hallId) return { fieldErrors: { hallId: "required" } };
    if (!(await prisma.hall.findFirst({ where: { id: hallId, businessId: inquiry.businessId } }))) return { formError: "generic" };
  }
  const calendarKey = hallCount > 0 ? hallId! : "main";
  await prisma.availabilityDay.upsert({
    where: { businessId_calendarKey_date: { businessId: inquiry.businessId, calendarKey, date } },
    create: { businessId: inquiry.businessId, calendarKey, hallId: hallCount > 0 ? hallId : null, date, status: "BOOKED" },
    update: { status: "BOOKED" },
  });

  const planned = await ensurePlannedVendor(inquiry.weddingId, inquiry.business, "BOOKED");
  // The agreed price: the accepted offer, else the latest one still waiting for an answer.
  const offer =
    (await prisma.offer.findFirst({ where: { inquiryId: inquiry.id, status: "ACCEPTED" }, orderBy: { createdAt: "desc" }, include: { expense: true } })) ??
    (await prisma.offer.findFirst({ where: { inquiryId: inquiry.id, status: "OPEN" }, orderBy: { createdAt: "desc" }, include: { expense: true } }));
  if (offer) {
    if (offer.status === "OPEN")
      await prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    if (!offer.expense)
      await createVendorExpense({
        weddingId: inquiry.weddingId,
        business: inquiry.business,
        plannedVendorId: planned.id,
        name: inquiry.packageName,
        amount: offer.price,
        currency: offer.currency,
        perPerson: offer.unit === "PER_PERSON",
        eventId: inquiry.eventId,
        offerId: offer.id,
      });
  }

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { status: "BOOKED", date, hallId: hallCount > 0 ? hallId : inquiry.hallId, lastMessageAt: new Date(), vendorSeenAt: new Date() },
  });
  await notify(
    await weddingTeam(inquiry.weddingId, access.user.id),
    "BOOKED",
    { business: inquiry.business.name, couple: coupleNames(inquiry.wedding) },
    coupleLink(inquiry.id),
  );
  refresh();
  return { ok: true };
}

/** Vendor turns the inquiry down, with an optional message. */
export async function declineInquiryAction(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorInquiry(inquiryId);
  if (!ctx) return { formError: "forbidden" };
  const { access, inquiry } = ctx;
  if (!open.includes(inquiry.status as (typeof open)[number])) return { formError: "inquiryClosed" };
  const text = String(fd.get("text") ?? "").trim().slice(0, 2000);
  const now = new Date();
  await prisma.offer.updateMany({ where: { inquiryId: inquiry.id, status: "OPEN" }, data: { status: "REPLACED" } });
  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      status: "DECLINED",
      lastMessageAt: now,
      vendorSeenAt: now,
      ...(text ? { messages: { create: { authorId: access.user.id, fromVendor: true, text } } } : {}),
    },
  });
  await notify(
    await weddingTeam(inquiry.weddingId, access.user.id),
    "DECLINED",
    { business: inquiry.business.name, couple: coupleNames(inquiry.wedding), excerpt: text ? excerpt(text) : undefined },
    coupleLink(inquiry.id),
  );
  refresh();
  return { ok: true };
}

/** Marks a thread as read for the viewer's side; called from the browser after the page opens. */
export async function markInquirySeenAction(inquiryId: string, side: "couple" | "vendor"): Promise<FormState> {
  if (typeof inquiryId !== "string") return { formError: "forbidden" };
  if (side === "couple") {
    const ctx = await coupleInquiryForViewer(inquiryId);
    if (!ctx) return { formError: "forbidden" };
    await prisma.inquiry.update({ where: { id: inquiryId }, data: { coupleSeenAt: new Date() } });
  } else {
    const ctx = await vendorInquiry(inquiryId);
    if (!ctx) return { formError: "forbidden" };
    await prisma.inquiry.update({ where: { id: inquiryId }, data: { vendorSeenAt: new Date() } });
  }
  refresh();
  return { ok: true };
}

/** Any member of the wedding, view-only included, can mark its threads as read. */
async function coupleInquiryForViewer(inquiryId: string) {
  const access = await getWeddingAccess();
  if (!access) return null;
  return prisma.inquiry.findFirst({ where: { id: inquiryId, weddingId: access.wedding.id }, select: { id: true } });
}
