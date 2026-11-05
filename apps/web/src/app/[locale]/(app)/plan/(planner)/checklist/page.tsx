import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChecklistManager } from "@/components/plan/checklist-manager";
import { todayIso } from "@/lib/dates";
import { dateInputValue, formatDate } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { taskDueDate } from "@/lib/planner-calc";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.checklist"))("title") };
}

export default async function ChecklistPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const [tasks, members] = await Promise.all([
    prisma.task.findMany({ where: { weddingId: wedding.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.weddingMember.findMany({ where: { weddingId: wedding.id }, include: { user: { select: { name: true } } } }),
  ]);
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const people = Array.from(new Set([wedding.partner1, wedding.partner2, ...members.map((m) => m.user.name)]));

  return (
    <ChecklistManager
      editable={canEdit(role)}
      hasDate={!!wedding.date}
      people={people}
      tasks={tasks.map((task) => {
        const due = taskDueDate(task, wedding.date);
        return {
          id: task.id,
          title: task.title,
          monthsBefore: task.monthsBefore,
          dueDate: dateInputValue(task.dueDate),
          dueLabel: due ? formatDate(due) : "",
          overdue: !!due && due < today,
          assignee: task.assignee,
          done: task.done,
        };
      })}
    />
  );
}
