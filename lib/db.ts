import { PrismaClient } from "@prisma/client";

// Prevent hot-reload in dev from spawning a new Prisma client per request
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
