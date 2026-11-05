import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BudgetManager } from "@/components/plan/budget-manager";
import { loadBudget } from "@/lib/budget-summary";
import { todayIso } from "@/lib/dates";
import { dateInputValue } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.budget"))("title") };
}

export default async function BudgetPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const te = await getTranslations("plan.events");
  const budget = await loadBudget(wedding);

  return (
    <BudgetManager
      editable={canEdit(role)}
      currency={wedding.currency}
      total={wedding.budgetTotal}
      planned={budget.planned}
      paid={budget.paid}
      byPayer={budget.byPayer}
      today={todayIso()}
      events={budget.events.map((e) => ({ id: e.id, name: eventName(e, te) }))}
      categories={budget.categories.map((c) => ({
        id: c.id,
        name: c.name,
        planned: c.planned,
        expenses: c.expenses.map((e) => ({
          id: e.id,
          categoryId: e.categoryId,
          name: e.name,
          costType: e.costType,
          amount: e.amount,
          childPrice: e.childPrice,
          currency: e.currency,
          eventId: e.eventId,
          guestsOverride: e.guestsOverride,
          payer: e.payer,
          notes: e.notes,
          plannedTotal: e.plannedTotal,
          plannedConv: e.plannedConv,
          people: e.people,
          usingEstimate: e.usingEstimate,
          vendorName: e.plannedVendor?.name ?? null,
          payments: e.payments.map((p) => ({
            id: p.id,
            kind: p.kind,
            amount: p.amount,
            currency: p.currency,
            dueDate: dateInputValue(p.dueDate),
            paidAt: dateInputValue(p.paidAt),
          })),
        })),
      }))}
    />
  );
}
