import "server-only";
import { prisma } from "@svadba/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { sendAuthEmail } from "./email";
import { env } from "./env";

export const auth = betterAuth({
  appName: "Svadba",
  baseURL: env.appUrl,
  secret: env.authSecret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const u = user as typeof user & { locale?: string };
      await sendAuthEmail({ to: u.email, name: u.name, locale: u.locale, kind: "reset", url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      const u = user as typeof user & { locale?: string };
      await sendAuthEmail({ to: u.email, name: u.name, locale: u.locale, kind: "verify", url });
    },
  },
  socialProviders: env.google ? { google: { ...env.google, prompt: "select_account" } } : {},
  account: {
    // Let someone who signed up with email later use "Continue with Google" for the same address.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    additionalFields: {
      locale: { type: "string", required: false, defaultValue: "mk", input: true },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        // Signing in during the 30-day grace period cancels account deletion (decision 89).
        after: async (session) => {
          await prisma.user.updateMany({
            where: { id: session.userId, deletionRequestedAt: { not: null } },
            data: { deletionRequestedAt: null },
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
