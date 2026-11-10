import { prisma } from "@svadba/db";
import { GUEST_ROLES, ROLE_SIDE, timelineSlots, type EventType } from "@svadba/shared";
import { AlertCircle, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Journey, type JourneyDot, type JourneyIcon, type JourneyRow } from "@/components/plan/journey";
import { PrintButton } from "@/components/plan/schedule-manager";
import { Link } from "@/i18n/navigation";
import { loadBudget } from "@/lib/budget-summary";
import { todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { coupleNames, daysUntil, eventName } from "@/lib/plan-helpers";
import { taskDueDate } from "@/lib/planner-calc";
import { requireWedding } from "@/lib/wedding";
import { cn } from "@/lib/utils";

const EVENT_ICON: Record<EventType, JourneyIcon> = {
  GROOM_HOME: "home",
  BRIDE_HOME: "home",
  CHURCH: "church",
  CIVIL: "civil",
  RECEPTION: "party",
  ENGAGEMENT: "ring",
  BACHELORETTE: "sparkles",
  CUSTOM: "calendar",
};
const KEY_EVENTS: EventType[] = ["CHURCH", "CIVIL", "RECEPTION"];

/** Icon for a day-timeline item from words in its title, in mk / sq / en (decision 123). First match wins. */
const ITEM_WORDS: [RegExp, JourneyIcon][] = [
  [/тргнув|патув|nisja|udhët|leaving|travel|drive|limo/i, "car"],
  [/венчав|црква|kurorë|kish|ceremony|church/i, "church"],
  [/фото|foto|photo/i, "camera"],
  [/торт|tort|cake/i, "cake"],
  [/танц|valle|dance/i, "music"],
  [/вечер|ручек|darka|drek|dinner|lunch|food/i, "dinner"],
  [/музик|бенд|muzik|music|band|dj/i, "music"],
  [/влез|hyrja|entrance/i, "entrance"],
  [/пречек|гости|mysafir|të ftuar|guests/i, "guests"],
  [/здрав|dolli|toast|коктел|cocktail/i, "toast"],
  [/облек|фустан|fustan|vesh|dress/i, "dress"],
  [/шминк|фризур|коса|grim|flok|makeup|hair/i, "sparkles"],
  [/невест|младожен|nuse|dhëndr|bride|groom/i, "home"],
  [/весел|забав|fest|party/i, "party"],
];
/** Key moments always get an accent dot: ceremony, the couple's entrance, first dance, dinner (decision 123). */
const KEY_WORDS = /венчав|kurorë|ceremony|влез на младенците|hyrja e çiftit|entrance|прв танц|vallja e parë|first dance|вечера|darka|dinner/i;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
const share = (dots: JourneyDot[]) => {
  // Line accent runs up to the last finished dot (dot slots sit at 0.32 / 0.57 / 0.82 of the row).
  const last = dots.map((d) => d.done).lastIndexOf(true);
  return last < 0 ? 0 : last === dots.length - 1 ? 1 : [0.32, 0.57, 0.82][last]!;
};

export default async function PlanOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding } = await requireWedding(locale);
  const t = await getTranslations("plan.overview");
  const te = await getTranslations("plan.events");
  const tg = await getTranslations("plan.guests");
  const today = todayIso();
  const todayDate = new Date(`${today}T00:00:00Z`);

  const [budget, guests, tasks, vendors, days] = await Promise.all([
    loadBudget(wedding),
    prisma.guest.findMany({
      where: { weddingId: wedding.id },
      select: { name: true, role: true, household: { select: { side: true } }, invitations: { select: { rsvp: true } } },
    }),
    prisma.task.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
    prisma.plannedVendor.findMany({ where: { weddingId: wedding.id }, select: { name: true, status: true } }),
    prisma.scheduleDay.findMany({
      where: { weddingId: wedding.id },
      orderBy: [{ date: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      include: { items: { orderBy: { sortOrder: "asc" }, include: { event: { select: { type: true } } } } },
    }),
  ]);
  const money = (n: number) => formatMoney(n, wedding.currency, locale);
  const rows: JourneyRow[] = [];

  // ─── Date ───
  const daysLeft = wedding.date ? daysUntil(wedding.date, today) : null;
  rows.push({
    id: "date",
    title: t("journey.date"),
    href: "/plan/settings",
    progress: wedding.date ? 1 : 0,
    content: wedding.date ? (
      <p>
        <span className="text-base font-semibold tabular-nums text-ink">{formatDate(wedding.date)}</span>
        <span className="block">
          {daysLeft! > 0 ? t("journey.daysLeft", { count: daysLeft! }) : daysLeft === 0 ? t("journey.today") : t("journey.married")}
        </span>
      </p>
    ) : (
      <Link href="/plan/settings" className="font-medium text-vranec hover:underline">
        {t("journey.setDate")}
      </Link>
    ),
  });

  // ─── Events ───
  const eventDots: JourneyDot[] = budget.events.map((e) => ({
    id: e.id,
    icon: EVENT_ICON[e.type],
    time: e.date ? formatDate(e.date) : undefined,
    label: eventName(e, te),
    done: !!e.date && e.date < todayDate,
    accent: KEY_EVENTS.includes(e.type),
  }));
  chunk(eventDots, 3).forEach((dots, i) =>
    rows.push({ id: `events-${i}`, title: i === 0 ? t("events") : undefined, href: "/plan/settings", progress: share(dots), dots }),
  );

  // ─── Guests and wedding party ───
  const sideStats = (side: string) => {
    const list = guests.filter((g) => g.household.side === side);
    const answered = (r: string) => list.filter((g) => g.invitations.some((i) => i.rsvp === r)).length;
    return { total: list.length, yes: answered("YES"), waiting: list.filter((g) => g.invitations.every((i) => i.rsvp === "PENDING")).length };
  };
  const bride = sideStats("BRIDE");
  const groom = sideStats("GROOM");
  const both = sideStats("BOTH");
  const waiting = bride.waiting + groom.waiting + both.waiting;
  const coming = bride.yes + groom.yes + both.yes;
  const party = GUEST_ROLES.flatMap((role) => {
    const g = guests.find((x) => x.role === role);
    return g ? [{ role, name: g.name }] : [];
  });
  rows.push({
    id: "guests",
    title: t("guests"),
    href: "/plan/guests",
    progress: guests.length === 0 ? 0 : waiting === 0 ? 1 : coming / guests.length,
    content:
      guests.length === 0 ? (
        <p>{t("noGuests")}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            {(["BRIDE", "GROOM"] as const).map((side) => {
              const s = side === "BRIDE" ? bride : groom;
              const names = party.filter((p) => ROLE_SIDE[p.role] === side);
              return (
                <div key={side} className={side === "BRIDE" ? "sm:text-right" : ""}>
                  <h3 className="font-medium text-ink">{tg(`sides.${side}`)}</h3>
                  <p className="text-2xl font-semibold tabular-nums text-ink">{s.total}</p>
                  <p>{t("journey.sideStats", { yes: s.yes, waiting: s.waiting })}</p>
                  {names.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {names.map((p) => (
                        <li key={p.role}>
                          <span className="text-stone">{tg(`roles.${p.role}`)}:</span> {p.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {both.total > 0 && (
            <p className="text-center">
              {tg("sides.BOTH")}: <span className="font-medium tabular-nums text-ink">{both.total}</span> ·{" "}
              {t("journey.sideStats", { yes: both.yes, waiting: both.waiting })}
            </p>
          )}
          <p className="text-center">{t("journey.guestsTotal", { total: guests.length, yes: coming, waiting })}</p>
        </div>
      ),
  });

  // ─── Checklist ───
  const doneTasks = tasks.filter((x) => x.done).length;
  const taskShare = tasks.length ? doneTasks / tasks.length : 0;
  const dueTasks = tasks
    .filter((x) => !x.done)
    .map((task) => ({ ...task, due: taskDueDate(task, wedding.date) }))
    .filter((task) => task.due)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime())
    .slice(0, 3);
  rows.push({
    id: "checklist",
    title: t("journey.checklist"),
    href: "/plan/checklist",
    progress: taskShare,
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-light tabular-nums text-ink">{Math.round(taskShare * 100)}%</p>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-vranec" style={{ width: `${taskShare * 100}%` }} />
          </div>
          <p className="mt-1 flex justify-between tabular-nums">
            <span>{t("journey.tasksTotal", { count: tasks.length })}</span>
            <span>{t("journey.tasksDone", { count: doneTasks })}</span>
          </p>
        </div>
        {!wedding.date ? (
          <p className="text-stone">{t("noDateTasks")}</p>
        ) : (
          dueTasks.length > 0 && (
            <ul className="space-y-1">
              {dueTasks.map((task) => (
                <li key={task.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink">{task.title}</span>
                  <span className={cn("shrink-0 tabular-nums", task.due! < todayDate ? "font-medium text-danger" : "text-stone")}>
                    {task.due! < todayDate ? t("overdue") : formatDate(task.due)}
                  </span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    ),
  });

  // ─── Budget ───
  const budgetBase = wedding.budgetTotal || budget.planned;
  const paidShare = budgetBase > 0 ? Math.min(1, budget.paid / budgetBase) : 0;
  const plannedShare = budgetBase > 0 ? Math.min(1, budget.planned / budgetBase) : 0;
  const duePayments = budget.payments
    .filter((p) => !p.paidAt && p.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 3);
  rows.push({
    id: "budget",
    title: t("budget"),
    href: "/plan/budget",
    progress: paidShare,
    content: (
      <div className="space-y-3">
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-sm",
                i < Math.round(paidShare * 10) ? "bg-vranec" : i < Math.round(plannedShare * 10) ? "bg-vranec/35" : "bg-ink/10",
              )}
            />
          ))}
        </div>
        {budgetBase === 0 ? (
          <Link href="/plan/budget" className="font-medium text-vranec hover:underline">
            {t("journey.setBudget")}
          </Link>
        ) : (
          <p className="tabular-nums">
            {wedding.budgetTotal
              ? t("plannedOf", { planned: money(budget.planned), total: money(wedding.budgetTotal) })
              : t("planned", { planned: money(budget.planned) })}
            {" · "}
            {t("paid", { paid: money(budget.paid) })}
          </p>
        )}
        {duePayments.length > 0 && (
          <ul className="space-y-1">
            {duePayments.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-1.5 text-ink">
                  {p.dueDate! < todayDate && <AlertCircle aria-hidden className="size-4 text-danger" />}
                  {p.expenseName}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(p.amount, p.currency, locale)} · {formatDate(p.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
  });

  // ─── Vendors ───
  const booked = vendors.filter((v) => v.status === "BOOKED");
  const considering = vendors.length - booked.length;
  rows.push({
    id: "vendors",
    title: t("vendors"),
    href: "/plan/vendors",
    progress: vendors.length ? booked.length / vendors.length : 0,
    content: (
      <div className="space-y-1">
        <p>{t("vendorsSummary", { booked: booked.length, considering })}</p>
        {booked.length > 0 && <p className="text-ink">{booked.map((v) => v.name).join(" · ")}</p>}
      </div>
    ),
  });

  // ─── The big day ───
  const dayItems = days.flatMap((d) => {
    const slots = timelineSlots(
      d.startTime,
      d.items.map((i) => i.durationMin),
    );
    const past = !!d.date && d.date < todayDate;
    return d.items.map((item, k) => {
      const wordIcon = ITEM_WORDS.find(([re]) => re.test(item.title))?.[1] ?? null;
      return {
        id: item.id,
        icon: wordIcon ?? (item.event ? EVENT_ICON[item.event.type] : null),
        time: slots[k]!.label + (slots[k]!.dayOffset > 0 ? " (+1)" : ""),
        label: item.title,
        done: past,
        accent: KEY_WORDS.test(item.title) || item.event?.type === "CHURCH",
      } satisfies JourneyDot;
    });
  });
  if (dayItems.length === 0) {
    rows.push({
      id: "day",
      title: t("journey.bigDay"),
      href: "/plan/schedule",
      progress: 0,
      content: (
        <Link href="/plan/schedule" className="font-medium text-vranec hover:underline">
          {t("journey.planDay")}
        </Link>
      ),
    });
  } else {
    chunk(dayItems, 3).forEach((dots, i) =>
      rows.push({ id: `day-${i}`, title: i === 0 ? t("journey.bigDay") : undefined, href: "/plan/schedule", progress: share(dots), dots }),
    );
  }

  // ─── After the wedding ───
  rows.push({
    id: "after",
    title: t("journey.after"),
    progress: 0,
    content: (
      <div className="space-y-1.5 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong px-5 py-4">
        <Link href="/plan/vendors" className="flex items-center gap-1.5 font-medium text-vranec hover:underline">
          {t("journey.reviews")} <ArrowRight aria-hidden className="size-3.5" />
        </Link>
        <a href="/api/account/export" download className="flex items-center gap-1.5 font-medium text-vranec hover:underline">
          {t("journey.export")} <ArrowRight aria-hidden className="size-3.5" />
        </a>
      </div>
    ),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-ink-soft">{t("journey.lead")}</p>
        <PrintButton />
      </div>
      <h1 className="hidden text-center font-display text-3xl print:block">{coupleNames(wedding)}</h1>
      <Journey partner1={wedding.partner1} partner2={wedding.partner2} rows={rows} />
    </div>
  );
}
