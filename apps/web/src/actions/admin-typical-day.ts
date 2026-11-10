"use server";

import { prisma } from "@svadba/db";
import { typicalDaySchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import type { ErrorKey, FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";

// Admin-edited "fill typical day" template (decision 111). Only future fills use it (decision 112).

const ID = "default";

async function isAdmin() {
  const user = await getCurrentUser();
  return !!user?.roles.includes("ADMIN");
}

/** Saves the whole template at once. Field errors are keyed "startTime", "steps" or "steps.<i>.<field>". */
export async function saveTypicalDayAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  let steps: unknown;
  try {
    steps = JSON.parse(String(fd.get("steps") ?? "[]"));
  } catch {
    return { formError: "generic" };
  }
  const parsed = typicalDaySchema.safeParse({ startTime: fd.get("startTime") ?? "", steps });
  if (!parsed.success) {
    const fieldErrors: Record<string, ErrorKey> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message as ErrorKey;
    return { fieldErrors };
  }
  const { startTime } = parsed.data;
  await prisma.$transaction([
    prisma.typicalDayTemplate.upsert({ where: { id: ID }, create: { id: ID, startTime }, update: { startTime } }),
    prisma.typicalDayStep.deleteMany({ where: { templateId: ID } }),
    prisma.typicalDayStep.createMany({
      data: parsed.data.steps.map((s, i) => ({ ...s, templateId: ID, sortOrder: i })),
    }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Drops the saved template, so the built-in one is used again. */
export async function resetTypicalDayAction(): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  await prisma.typicalDayTemplate.deleteMany({ where: { id: ID } });
  revalidatePath("/", "layout");
  return { ok: true };
}
