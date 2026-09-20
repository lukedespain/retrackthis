import { PrismaClient } from "@prisma/client";

// Reuse one client across warm serverless invocations. With Supabase transaction
// pooling (port 6543 + pgbouncer=true + connection_limit=1) this stays well
// under the pool size; session-mode URLs exhaust connections on Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = db;
