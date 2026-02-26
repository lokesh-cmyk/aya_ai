-- CreateEnum
CREATE TYPE "KBFolderType" AS ENUM ('GENERAL', 'MEETING_TRANSCRIPTS', 'UPLOADS');

-- CreateEnum
CREATE TYPE "KBFileType" AS ENUM ('PDF', 'IMAGE', 'MARKDOWN', 'TEXT', 'AUDIO', 'TRANSCRIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "KBDocumentSource" AS ENUM ('UPLOAD', 'MEETING_TRANSCRIPT', 'AI_GENERATED', 'INTEGRATION');

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBFolder" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "KBFolderType" NOT NULL DEFAULT 'GENERAL',
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBDocument" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileType" "KBFileType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "content" TEXT,
    "pineconeId" TEXT,
    "source" "KBDocumentSource" NOT NULL DEFAULT 'UPLOAD',
    "sourceReferenceId" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "content" TEXT,
    "pineconeId" TEXT,
    "changeNote" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KBFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBProjectSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "autoSaveTranscripts" BOOLEAN NOT NULL DEFAULT true,
    "transcriptFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KBProjectSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeBase_teamId_idx" ON "KnowledgeBase"("teamId");

-- CreateIndex
CREATE INDEX "KBFolder_knowledgeBaseId_idx" ON "KBFolder"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "KBFolder_parentFolderId_idx" ON "KBFolder"("parentFolderId");

-- CreateIndex
CREATE INDEX "KBFolder_projectId_idx" ON "KBFolder"("projectId");

-- CreateIndex
CREATE INDEX "KBDocument_folderId_idx" ON "KBDocument"("folderId");

-- CreateIndex
CREATE INDEX "KBDocument_knowledgeBaseId_idx" ON "KBDocument"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "KBDocument_uploadedById_idx" ON "KBDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "KBDocument_source_idx" ON "KBDocument"("source");

-- CreateIndex
CREATE INDEX "KBDocument_isArchived_idx" ON "KBDocument"("isArchived");

-- CreateIndex
CREATE INDEX "KBDocumentVersion_documentId_idx" ON "KBDocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "KBFavorite_userId_idx" ON "KBFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KBFavorite_userId_documentId_key" ON "KBFavorite"("userId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KBProjectSettings_projectId_key" ON "KBProjectSettings"("projectId");

-- CreateIndex
CREATE INDEX "KBProjectSettings_knowledgeBaseId_idx" ON "KBProjectSettings"("knowledgeBaseId");

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFolder" ADD CONSTRAINT "KBFolder_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFolder" ADD CONSTRAINT "KBFolder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "KBFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFolder" ADD CONSTRAINT "KBFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFolder" ADD CONSTRAINT "KBFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBDocument" ADD CONSTRAINT "KBDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "KBFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBDocument" ADD CONSTRAINT "KBDocument_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBDocument" ADD CONSTRAINT "KBDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBDocumentVersion" ADD CONSTRAINT "KBDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KBDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBDocumentVersion" ADD CONSTRAINT "KBDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFavorite" ADD CONSTRAINT "KBFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBFavorite" ADD CONSTRAINT "KBFavorite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KBDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBProjectSettings" ADD CONSTRAINT "KBProjectSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBProjectSettings" ADD CONSTRAINT "KBProjectSettings_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KBProjectSettings" ADD CONSTRAINT "KBProjectSettings_transcriptFolderId_fkey" FOREIGN KEY ("transcriptFolderId") REFERENCES "KBFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
