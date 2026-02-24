// scripts/seed-playbooks.ts
// Run with: npx tsx scripts/seed-playbooks.ts <teamId>

import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../app/generated/prisma/client';
import { DEFAULT_PLAYBOOKS } from '../lib/vendors/seed-playbooks';

async function main() {
  const teamId = process.argv[2];
  if (!teamId) {
    console.error('Usage: npx tsx scripts/seed-playbooks.ts <teamId>');
    console.error('\nTo find your teamId, run:');
    console.error('  npx tsx scripts/find-teams.ts');
    process.exit(1);
  }

  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if already seeded
    const existing = await prisma.playbook.count({
      where: { teamId, isSystemProvided: true },
    });

    if (existing > 0) {
      console.log(`Already seeded: ${existing} system playbooks exist for team ${teamId}`);
      process.exit(0);
    }

    // Seed all playbooks
    const results = await prisma.$transaction(
      DEFAULT_PLAYBOOKS.map((playbook) =>
        prisma.playbook.create({
          data: {
            ...playbook,
            teamId,
          },
        })
      )
    );

    console.log(`Seeded ${results.length} playbooks for team ${teamId}:`);
    results.forEach((p) => console.log(`  - ${p.name} (${p.category})`));
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
