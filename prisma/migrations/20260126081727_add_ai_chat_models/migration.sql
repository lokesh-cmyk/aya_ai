-- CreateTable
CREATE TABLE "AIChatConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "model" TEXT NOT NULL DEFAULT 'sonnet-4.5',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AIChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIChatMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "AIChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIChatConversation_userId_idx" ON "AIChatConversation"("userId");

-- CreateIndex
CREATE INDEX "AIChatConversation_createdAt_idx" ON "AIChatConversation"("createdAt");

-- CreateIndex
CREATE INDEX "AIChatConversation_updatedAt_idx" ON "AIChatConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "AIChatMessage_conversationId_idx" ON "AIChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AIChatMessage_createdAt_idx" ON "AIChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "AIChatConversation" ADD CONSTRAINT "AIChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIChatMessage" ADD CONSTRAINT "AIChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
