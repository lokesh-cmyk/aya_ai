import { PrismaClient } from "./generated/prisma";

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});
