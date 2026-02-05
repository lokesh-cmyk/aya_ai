-- CreateTable
CREATE TABLE "TeamChat" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "TeamChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChatRead" (
    "id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TeamChatRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamChat_teamId_idx" ON "TeamChat"("teamId");

-- CreateIndex
CREATE INDEX "TeamChat_senderId_idx" ON "TeamChat"("senderId");

-- CreateIndex
CREATE INDEX "TeamChat_createdAt_idx" ON "TeamChat"("createdAt");

-- CreateIndex
CREATE INDEX "TeamChat_parentId_idx" ON "TeamChat"("parentId");

-- CreateIndex
CREATE INDEX "TeamChatRead_chatId_idx" ON "TeamChatRead"("chatId");

-- CreateIndex
CREATE INDEX "TeamChatRead_userId_idx" ON "TeamChatRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChatRead_chatId_userId_key" ON "TeamChatRead"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "TeamChat" ADD CONSTRAINT "TeamChat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChat" ADD CONSTRAINT "TeamChat_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChat" ADD CONSTRAINT "TeamChat_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TeamChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatRead" ADD CONSTRAINT "TeamChatRead_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TeamChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatRead" ADD CONSTRAINT "TeamChatRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
