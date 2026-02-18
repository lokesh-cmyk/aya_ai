/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendText, toChatId } from "@/lib/integrations/waha";
import { RRule } from "rrule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReminderTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function getNextOccurrence(rruleStr: string, after: Date): Date | null {
  try {
    const rule = RRule.fromString(rruleStr);
    return rule.after(after, false);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Message formatting
// ---------------------------------------------------------------------------

function build24hMessage(
  title: string,
  description: string | null,
  displayTime: string,
  rrule: string | null
): string {
  let msg = `\u23F0 *Reminder \u2014 Tomorrow*\n\n\uD83D\uDCCC ${title}`;
  if (description) msg += `\n_${description}_`;
  msg += `\n\uD83D\uDCC5 ${displayTime}`;
  if (rrule) msg += `\n\uD83D\uDD01 _Recurring_`;
  msg += `\n\n_You'll get another reminder 30 minutes before._`;
  return msg;
}

function build30mMessage(
  title: string,
  description: string | null,
  displayTime: string,
  rrule: string | null
): string {
  let msg = `\uD83D\uDD14 *Reminder \u2014 In 30 minutes!*\n\n\uD83D\uDCCC ${title}`;
  if (description) msg += `\n_${description}_`;
  msg += `\n\uD83D\uDCC5 ${displayTime}`;
  if (rrule) msg += `\n\uD83D\uDD01 _Recurring_`;
  msg += `\n\n_This is your final reminder._`;
  return msg;
}

// ---------------------------------------------------------------------------
// Inngest cron — runs every minute
// ---------------------------------------------------------------------------

export const whatsappReminderDelivery = inngest.createFunction(
  { id: "whatsapp-reminder-delivery", concurrency: { limit: 1 } },
  { cron: "* * * * *" },
  async ({ step }) => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in30m = new Date(now.getTime() + 30 * 60 * 1000);

    // 1. Query reminders that need a ping
    const dueReminders = await step.run("query-due-reminders", async () => {
      return prisma.reminder.findMany({
        where: {
          status: "active",
          OR: [
            { pingSent24h: false, remindAt: { lte: in24h } },
            { pingSent30m: false, remindAt: { lte: in30m } },
          ],
        },
        include: {
          user: { select: { id: true, whatsappPhone: true, name: true } },
        },
        take: 100,
        orderBy: { remindAt: "asc" },
      });
    });

    if (dueReminders.length === 0) {
      return { sent: 0 };
    }

    // 2. Process in batches of 20
    let totalSent = 0;
    const batchSize = 20;
    const batches = Math.ceil(dueReminders.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batch = dueReminders.slice(batchStart, batchStart + batchSize);

      const batchSent = await step.run(`send-batch-${i}`, async () => {
        let sent = 0;

        for (const reminder of batch) {
          const phone = reminder.user?.whatsappPhone;
          if (!phone) continue;

          const chatId = toChatId(phone);
          const displayTime = formatReminderTime(
            new Date(reminder.remindAt),
            reminder.timezone
          );

          try {
            if (!reminder.pingSent30m && new Date(reminder.remindAt) <= in30m) {
              // 30-minute ping
              const message = build30mMessage(
                reminder.title,
                reminder.description,
                displayTime,
                reminder.rrule
              );
              await sendText(chatId, message);
              await prisma.reminder.update({
                where: { id: reminder.id },
                data: { pingSent30m: true, lastPingAt: new Date() },
              });
              sent++;
            } else if (
              !reminder.pingSent24h &&
              new Date(reminder.remindAt) <= in24h
            ) {
              // 24-hour ping
              const message = build24hMessage(
                reminder.title,
                reminder.description,
                displayTime,
                reminder.rrule
              );
              await sendText(chatId, message);
              await prisma.reminder.update({
                where: { id: reminder.id },
                data: { pingSent24h: true, lastPingAt: new Date() },
              });
              sent++;
            }
          } catch (error: any) {
            console.error(
              `[reminder-delivery] Failed to send ping for reminder ${reminder.id}:`,
              error.message
            );
            // Do NOT update flags — cron retries next minute
          }
        }

        return sent;
      });

      totalSent += batchSent;

      // Delay between batches (skip after last batch)
      if (i < batches - 1) {
        await step.sleep("batch-delay", "500ms");
      }
    }

    // 3. Advance completed reminders (both pings sent, remindAt has passed)
    await step.run("advance-completed-reminders", async () => {
      const completedReminders = await prisma.reminder.findMany({
        where: {
          status: "active",
          pingSent30m: true,
          remindAt: { lte: now },
        },
      });

      for (const reminder of completedReminders) {
        if (reminder.rrule) {
          // Recurring — advance to next occurrence
          const next = getNextOccurrence(
            reminder.rrule,
            new Date(reminder.remindAt)
          );
          if (next) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                remindAt: next,
                pingSent24h: false,
                pingSent30m: false,
              },
            });
          } else {
            // No more occurrences
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "completed" },
            });
          }
        } else {
          // One-time — mark completed
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: "completed" },
          });
        }
      }
    });

    return { sent: totalSent, processed: dueReminders.length };
  }
);
