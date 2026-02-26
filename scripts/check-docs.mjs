import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/index.js';

const prisma = new PrismaClient();

const docs = await prisma.kBDocument.findMany({
  where: { isArchived: false },
  select: { id: true, title: true, storageKey: true, fileType: true, content: true, pineconeId: true },
  take: 10,
});

console.log(`Documents in DB (${docs.length}):\n`);
for (const doc of docs) {
  const hasContent = doc.content && doc.content.length > 0;
  console.log(`  - ${doc.title}`);
  console.log(`    fileType: ${doc.fileType}`);
  console.log(`    storageKey: ${doc.storageKey}`);
  console.log(`    hasContent: ${hasContent}`);
  console.log(`    contentLength: ${doc.content ? doc.content.length : 0}`);
  console.log(`    pineconeId: ${doc.pineconeId || 'NONE (not indexed)'}`);
  console.log('');
}

await prisma.$disconnect();
