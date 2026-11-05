# Svadba — notes for Claude

- Product decisions: `PLAN.md` (sections 3 decisions log, 6 phases, 7 data model, 8 screens). Don't build features outside the current phase without asking.
- Monorepo: `apps/web` (Next.js 16), `packages/db` (Prisma 7), `packages/shared` (zod + constants), `packages/i18n` (messages).
- Next.js 16: middleware file is `src/proxy.ts`; route `params` are Promises. Read `[locale]` with `localeFrom(params)` from `@/lib/locale`.
- Every user-facing string goes in all three files `packages/i18n/src/messages/{mk,sq,en}.json`. Zod error messages are keys in the `errors` namespace.
- Translated DB columns use the `nameMk / nameSq / nameEn` pattern; read with `pickLocalized` from `@svadba/shared`.
- App roles live on `user.roles` (COUPLE / VENDOR / ADMIN), not in Better Auth. Use `getCurrentUser`, `requireUser`, `requireAdmin` from `@/lib/session`. Server Actions must re-check the role themselves.
- Images: always go through `saveImage` in `@/lib/storage` (validates, re-encodes to WebP).
- Design tokens are in `apps/web/src/app/globals.css` (linen / ink / vranec). Headings use Prata, but its digit 1 looks like "l": show numbers and dates in the body font (Onest).
- Checks before finishing: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Local DB: `pnpm db:up` (Docker, port 5434). Dev server: port 3100. Dev emails print to the server log.
