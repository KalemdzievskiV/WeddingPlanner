# Svadba (working name)

Wedding planning for North Macedonia: a planner for couples plus a catalog of restaurants, bands and photo studios that manage their own listings. Product decisions live in [PLAN.md](PLAN.md).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 16 (App Router, TypeScript), Tailwind CSS 4
- **Database:** PostgreSQL + Prisma 7
- **Login:** Better Auth (email + password with email confirmation, optional Google)
- **Languages:** next-intl, `/mk` (default), `/sq` (Albanian), `/en`
- **Images:** sharp → Cloudflare R2 (local folder in development)
- **Email:** Resend (printed to the console in development)

```
apps/web            Next.js app
packages/db         Prisma schema, migrations, seed, client
packages/shared     Locales, roles, zod schemas (shared with the future mobile app)
packages/i18n       Translations: mk.json, sq.json, en.json
```

## Run locally

Requires Node 20.9+, pnpm 9 and Docker.

```bash
pnpm install
```

```bash
cp .env.example .env   # then fill BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
```

```bash
pnpm db:up             # Postgres on port 5434
```

```bash
pnpm db:migrate        # apply migrations
```

```bash
pnpm db:seed           # cities, categories, venue features, default checklist/budget, first admin
```

```bash
pnpm dev               # http://localhost:3100
```

Without `RESEND_API_KEY`, confirmation and password-reset emails are printed in the dev server output. Open the printed link to confirm an account.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the web app on port 3100 |
| `pnpm build` | Production build |
| `pnpm typecheck` / `pnpm lint` | Checks for all packages |
| `pnpm db:migrate` | Create/apply a migration after editing `schema.prisma` |
| `pnpm db:seed` | Seed reference data (safe to re-run; never overwrites existing rows or the admin) |
| `pnpm db:studio` | Browse the database |

## Translations

All UI text is in `packages/i18n/src/messages/*.json`. English is the reference: every language must have the same keys (TypeScript checks this). The Albanian text needs a review by a native speaker before launch.

## Deploy (Railway)

1. Create a Railway project with a **Postgres** service and a service from this repo (uses `Dockerfile` + `railway.json`).
2. Set the variables from `.env.example` on the web service. `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `BETTER_AUTH_URL` = the public URL.
3. For images in production, create a Cloudflare R2 bucket with public access and fill the `R2_*` variables. Without R2 the app writes to `UPLOAD_DIR`, which needs a Railway volume.
4. For email, verify a sending domain in Resend and set `RESEND_API_KEY` and `EMAIL_FROM`.
5. For maps, create a free MapTiler key and set `NEXT_PUBLIC_MAPTILER_KEY` (development uses OpenStreetMap tiles).
6. For Google login, create an OAuth client in Google Cloud with the redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`.

On every start the container applies migrations, runs the seed, then starts Next.js.
