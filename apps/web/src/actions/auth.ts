"use server";

import { prisma } from "@svadba/db";
import { ACCOUNT_TYPES, isLocale, signUpSchema } from "@svadba/shared";
import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/session";

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState & { email?: string }> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("accountType"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { name, email, password, accountType, locale } = parsed.data;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password, locale, callbackURL: `/${locale}${safeNextPath(formData.get("next")) ?? "/app"}` },
    });
    // When the email already exists Better Auth returns a fake user (to hide which emails exist),
    // so this update only touches a real, freshly created account.
    await prisma.user.updateMany({
      where: { id: result.user.id, roles: { isEmpty: true } },
      data: { roles: [accountType] },
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS") {
      return { formError: "emailTaken" };
    }
    console.error("[signUp]", error);
    return { formError: "generic" };
  }
  return { ok: true, email };
}

/** For people who signed in with Google and haven't picked couple / vendor yet. */
export async function chooseAccountTypeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const locale = formData.get("locale");
  if (!user || !isLocale(locale)) return { formError: "forbidden" };
  const type = formData.get("accountType");
  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    return { fieldErrors: { accountType: "accountType" } };
  }
  if (!user.roles.includes(type as (typeof ACCOUNT_TYPES)[number])) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { push: type as (typeof ACCOUNT_TYPES)[number] } },
    });
  }
  redirect(`/${locale}/app`);
}
