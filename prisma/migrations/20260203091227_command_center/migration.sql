-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'JOINING', 'IN_PROGRESS', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingPlatform" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS');

-- CreateEnum
CREATE TYPE "RecordingMode" AS ENUM ('SPEAKER_VIEW', 'GALLERY_VIEW', 'AUDIO_ONLY');

-- CreateTable
CREATE TABLE "MeetingBotSettings" (
    "id" TEXT NOT NULL,
    "botName" TEXT NOT NULL DEFAULT 'AYA Meeting Assistant',
    "botImage" TEXT,
    "entryMessage" TEXT,
    "recordingMode" "RecordingMode" NOT NULL DEFAULT 'SPEAKER_VIEW',
    "autoJoinEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MeetingBotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingUrl" TEXT NOT NULL,
    "platform" "MeetingPlatform" NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "duration" INTEGER,
    "botId" TEXT,
    "calendarEventId" TEXT,
    "recordingUrl" TEXT,
    "botExcluded" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingTranscript" (
    "id" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "language" TEXT DEFAULT 'en',
    "wordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "MeetingTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInsight" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "MeetingInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "speakingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "snoozeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingBotSettings_userId_key" ON "MeetingBotSettings"("userId");

-- CreateIndex
CREATE INDEX "MeetingBotSettings_userId_idx" ON "MeetingBotSettings"("userId");

-- CreateIndex
CREATE INDEX "Meeting_userId_idx" ON "Meeting"("userId");

-- CreateIndex
CREATE INDEX "Meeting_teamId_idx" ON "Meeting"("teamId");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE INDEX "Meeting_scheduledStart_idx" ON "Meeting"("scheduledStart");

-- CreateIndex
CREATE INDEX "Meeting_botId_idx" ON "Meeting"("botId");

-- CreateIndex
CREATE INDEX "Meeting_calendarEventId_idx" ON "Meeting"("calendarEventId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingTranscript_meetingId_key" ON "MeetingTranscript"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingTranscript_meetingId_idx" ON "MeetingTranscript"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingInsight_meetingId_idx" ON "MeetingInsight"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingInsight_type_idx" ON "MeetingInsight"("type");

-- CreateIndex
CREATE INDEX "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_email_idx" ON "MeetingParticipant"("email");

-- CreateIndex
CREATE INDEX "SignalDismissal_userId_idx" ON "SignalDismissal"("userId");

-- CreateIndex
CREATE INDEX "SignalDismissal_snoozeUntil_idx" ON "SignalDismissal"("snoozeUntil");

-- CreateIndex
CREATE UNIQUE INDEX "SignalDismissal_userId_signalKey_key" ON "SignalDismissal"("userId", "signalKey");

-- AddForeignKey
ALTER TABLE "MeetingBotSettings" ADD CONSTRAINT "MeetingBotSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingTranscript" ADD CONSTRAINT "MeetingTranscript_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInsight" ADD CONSTRAINT "MeetingInsight_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalDismissal" ADD CONSTRAINT "SignalDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
