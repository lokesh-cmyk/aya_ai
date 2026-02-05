/*
  Warnings:

  - A unique constraint covering the columns `[name,type,userId,teamId]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Integration_name_type_key";

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Integration_userId_idx" ON "Integration"("userId");

-- CreateIndex
CREATE INDEX "Integration_teamId_idx" ON "Integration"("teamId");

-- CreateIndex
CREATE INDEX "Integration_name_isActive_idx" ON "Integration"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_name_type_userId_teamId_key" ON "Integration"("name", "type", "userId", "teamId");

-- CreateIndex
CREATE INDEX "Message_externalId_idx" ON "Message"("externalId");
