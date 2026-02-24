import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../app/generated/prisma/client';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

prisma.team.findMany({ select: { id: true, name: true } })
  .then((teams) => { console.log(JSON.stringify(teams, null, 2)); })
  .finally(() => prisma.$disconnect());
