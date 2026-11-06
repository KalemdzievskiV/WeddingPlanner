# Production image for Railway. Runs migrations + seed (both idempotent), then starts Next.js.
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/i18n/package.json packages/i18n/
COPY packages/db/package.json packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma packages/db/prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_MAPTILER_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_TELEMETRY_DISABLED=1
# The Sentry token is only used here, to upload source maps; it is not kept in the final environment.
RUN SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT pnpm --filter @svadba/web build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed && pnpm --filter @svadba/web exec next start -p ${PORT:-3000}"]
