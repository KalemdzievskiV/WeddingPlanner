import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { config as loadEnv } from "dotenv";

// One .env for the whole monorepo, at the repo root. Real env vars (Railway) win.
loadEnv({ path: path.join(import.meta.dirname, "../../.env"), quiet: true });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@svadba/db", "@svadba/shared", "@svadba/i18n"],
  serverExternalPackages: ["sharp"],
  experimental: {
    // Photo uploads go through Server Actions; the default 1 MB body cap is too small.
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    remotePatterns: process.env.R2_PUBLIC_URL ? [new URL(`${process.env.R2_PUBLIC_URL}/**`)] : [],
  },
};

export default withNextIntl(nextConfig);
