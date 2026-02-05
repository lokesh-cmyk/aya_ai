-- CreateTable
CREATE TABLE "TaskWatcher" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCommentReaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskWatcher_taskId_idx" ON "TaskWatcher"("taskId");

-- CreateIndex
CREATE INDEX "TaskWatcher_userId_idx" ON "TaskWatcher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskWatcher_taskId_userId_key" ON "TaskWatcher"("taskId", "userId");

-- CreateIndex
CREATE INDEX "TaskCommentReaction_commentId_idx" ON "TaskCommentReaction"("commentId");

-- CreateIndex
CREATE INDEX "TaskCommentReaction_userId_idx" ON "TaskCommentReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCommentReaction_commentId_userId_key" ON "TaskCommentReaction"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCommentReaction" ADD CONSTRAINT "TaskCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCommentReaction" ADD CONSTRAINT "TaskCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
