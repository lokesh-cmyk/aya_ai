/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/prisma.ts

import { PrismaClient } from "@/app/generated/prisma/client";

import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === "development" 
    ? ["query", "info", "warn", "error"] 
    : ["error"],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;