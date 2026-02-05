/*
  Warnings:

  - A unique constraint covering the columns `[teamCode]` on the table `TeamInvite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamCode` to the `TeamInvite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeamInvite" ADD COLUMN     "teamCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_teamCode_key" ON "TeamInvite"("teamCode");

-- CreateIndex
CREATE INDEX "TeamInvite_teamCode_idx" ON "TeamInvite"("teamCode");
