import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The single .env lives at the repo root.
config({ path: path.join(import.meta.dirname, "../../.env"), quiet: true });

// `prisma generate` needs no database. Attach the datasource only when the URL
// exists, so Docker builds (no DATABASE_URL yet) still work.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
