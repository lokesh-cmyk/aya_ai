-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "whatsappSummarySentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappMeetingSummaryEnabled" BOOLEAN NOT NULL DEFAULT false;
