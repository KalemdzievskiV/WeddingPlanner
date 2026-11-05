import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Creating the client doesn't open a connection; the first query does. That keeps
// `next build` (which imports this module but has no database) working.
// At runtime a missing DATABASE_URL fails on the first query.
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Reuse one client across hot reloads in development.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "./generated/prisma/client";
