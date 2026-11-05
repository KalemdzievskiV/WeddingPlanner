import { prisma } from "@svadba/db";
import { AlertCircle, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { loadBudget } from "@/lib/budget-summary";
import { todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { taskDueDate } from "@/lib/planner-calc";
import { requireWedding } from "@/lib/wedding";
import { cn } from "@/lib/utils";

export default async function PlanOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding } = await requireWedding(locale);
  const t = await getTranslations("plan.overview");
  const te = await getTranslations("plan.events");
  const todayDate = new Date(`${todayIso()}T00:00:00Z`);
  const soon = new Date(todayDate.getTime() + 30 * 86_400_000);

  const [budget, guests, tasks, vendors] = await Promise.all([
    loadBudget(wedding),
    prisma.guest.findMany({ where: { weddingId: wedding.id }, select: { household: { select: { side: true } }, invitations: true } }),
    prisma.task.findMany({ where: { weddingId: wedding.id, done: false }, orderBy: { sortOrder: "asc" } }),
    prisma.plannedVendor.groupBy({ by: ["status"], where: { weddingId: wedding.id }, _count: true }),
  ]);

  const reception = budget.events.find((e) => e.type === "RECEPTION") ?? budget.events[0];
  const answers = (rsvp: string) =>
    guests.filter((g) => g.invitations.some((i) => i.eventId === reception?.id && i.rsvp === rsvp)).length;
  const side = (s: string) => guests.filter((g) => g.household.side === s).length;

  const dueTasks = tasks
    .map((task) => ({ ...task, due: taskDueDate(task, wedding.date) }))
    .filter((task) => task.due && task.due <= soon)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime())
    .slice(0, 6);
  const duePayments = budget.payments
    .filter((p) => !p.paidAt && p.dueDate && p.dueDate <= soon)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5);
  const money = (n: number) => formatMoney(n, wedding.currency, locale);
  const vendorCount = (s: string) => vendors.find((v) => v.status === s)?._count ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Tile title={t("guests")} href="/plan/guests" more={t("viewAll")}>
        {guests.length === 0 ? (
          <p className="text-stone">{t("noGuests")}</p>
        ) : (
          <>
            <p className="text-3xl font-semibold tabular-nums">{guests.length}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {t("guestsSummary", { invited: guests.length, yes: answers("YES"), no: answers("NO") })}
            </p>
            <p className="mt-1 text-sm text-stone">{t("sides", { bride: side("BRIDE"), groom: side("GROOM"), both: side("BOTH") })}</p>
          </>
        )}
      </Tile>

      <Tile title={t("budget")} href="/plan/budget" more={t("viewAll")}>
        <p className="text-3xl font-semibold tabular-nums">{money(budget.planned)}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {wedding.budgetTotal ? t("plannedOf", { planned: money(budget.planned), total: money(wedding.budgetTotal) }) : t("planned", { planned: money(budget.planned) })}
          {" · "}
          {t("paid", { paid: money(budget.paid) })}
        </p>
        {wedding.budgetTotal ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.07]">
            <div
              className={cn("h-full rounded-full", budget.planned > wedding.budgetTotal ? "bg-danger" : "bg-olive")}
              style={{ width: `${Math.min(100, (budget.planned / wedding.budgetTotal) * 100)}%` }}
            />
          </div>
        ) : null}
      </Tile>

      <Tile title={t("tasks")} href="/plan/checklist" more={t("viewAll")}>
        {!wedding.date ? (
          <p className="text-stone">{t("noDateTasks")}</p>
        ) : dueTasks.length === 0 ? (
          <p className="text-stone">{t("noTasks")}</p>
        ) : (
          <ul className="space-y-2">
            {dueTasks.map((task) => (
              <li key={task.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{task.title}</span>
                <span className={cn("shrink-0 tabular-nums", task.due! < todayDate ? "font-medium text-danger" : "text-stone")}>
                  {task.due! < todayDate ? t("overdue") : formatDate(task.due)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title={t("payments")} href="/plan/budget" more={t("viewAll")}>
        {duePayments.length === 0 ? (
          <p className="text-stone">{t("noPayments")}</p>
        ) : (
          <ul className="space-y-2">
            {duePayments.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  {p.dueDate! < todayDate && <AlertCircle aria-hidden className="size-4 text-danger" />}
                  {p.expenseName}
                </span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {formatMoney(p.amount, p.currency, locale)} · {formatDate(p.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title={t("events")} href="/plan/settings" more={t("viewAll")}>
        <ul className="space-y-2 text-sm">
          {budget.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>{eventName(e, te)}</span>
              <span className="tabular-nums text-stone">
                {e.date ? formatDate(e.date) : te("noDate")}
                {e.time ? ` · ${e.time}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Tile>

      <Tile title={t("vendors")} href="/plan/vendors" more={t("viewAll")}>
        <p className="text-sm text-ink-soft">
          {t("vendorsSummary", { booked: vendorCount("BOOKED"), considering: vendorCount("CONSIDERING") })}
        </p>
      </Tile>
    </div>
  );
}

function Tile({ title, href, more, children }: { title: string; href: string; more: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-vranec hover:underline">
          {more} <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}
