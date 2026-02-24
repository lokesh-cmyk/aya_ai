/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";

/** Format a date in the user's timezone for display. */
function formatDisplayTime(date: Date, timezone: string): string {
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

/**
 * Build custom AI tools for notes and reminders.
 * Each tool is scoped to the given userId for authorization.
 */
export function getNotesAndReminderTools(userId: string, timezone: string | null) {
  const tz = timezone || "UTC";

  return {
    save_note: tool({
      description:
        "Save a personal note for the user. Use when user says 'save this', 'note this down', 'remember that', or wants to store information for later.",
      inputSchema: z.object({
        content: z.string().describe("The note content to save"),
        title: z.string().optional().describe("Short title for the note. Auto-generate if not provided."),
        tags: z.array(z.string()).optional().describe("Tags/keywords for categorization. Auto-generate if not provided."),
      }),
      execute: async ({ content, title, tags }) => {
        const note = await prisma.userNote.create({
          data: {
            userId,
            content: content.slice(0, 4000),
            title: title || null,
            tags: (tags || []).map((t) => t.toLowerCase()),
            source: "whatsapp",
          },
        });
        return {
          success: true,
          id: note.id,
          title: note.title,
          message: `Note saved successfully.`,
        };
      },
    }),

    list_notes: tool({
      description:
        "List the user's saved notes. Optionally search by keyword across content, title, and tags.",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword to search for in notes"),
        limit: z.number().optional().describe("Max notes to return. Default 10."),
      }),
      execute: async ({ search, limit }) => {
        const take = Math.min(limit || 10, 50);
        const where: any = { userId };

        if (search) {
          const term = search.toLowerCase();
          where.OR = [
            { content: { contains: term, mode: "insensitive" } },
            { title: { contains: term, mode: "insensitive" } },
            { tags: { has: term } },
          ];
        }

        const notes = await prisma.userNote.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
            createdAt: true,
          },
        });

        return {
          notes: notes.map((n, i) => ({
            number: i + 1,
            id: n.id,
            title: n.title || "(untitled)",
            content: n.content.slice(0, 200) + (n.content.length > 200 ? "..." : ""),
            tags: n.tags,
            createdAt: n.createdAt.toISOString(),
          })),
          total: notes.length,
        };
      },
    }),

    update_note: tool({
      description: "Update an existing note's content, title, or tags.",
      inputSchema: z.object({
        noteId: z.string().describe("The ID of the note to update"),
        content: z.string().optional().describe("New content for the note"),
        title: z.string().optional().describe("New title for the note"),
        tags: z.array(z.string()).optional().describe("New tags for the note"),
      }),
      execute: async ({ noteId, content, title, tags }) => {
        const note = await prisma.userNote.findFirst({
          where: { id: noteId, userId },
        });
        if (!note) return { success: false, error: "Note not found." };

        const data: any = {};
        if (content !== undefined) data.content = content.slice(0, 4000);
        if (title !== undefined) data.title = title;
        if (tags !== undefined) data.tags = tags.map((t) => t.toLowerCase());

        const updated = await prisma.userNote.update({
          where: { id: noteId },
          data,
        });
        return { success: true, id: updated.id, title: updated.title };
      },
    }),

    delete_note: tool({
      description: "Delete a note permanently. Confirm with the user before calling this.",
      inputSchema: z.object({
        noteId: z.string().describe("The ID of the note to delete"),
      }),
      execute: async ({ noteId }) => {
        const note = await prisma.userNote.findFirst({
          where: { id: noteId, userId },
        });
        if (!note) return { success: false, error: "Note not found." };

        await prisma.userNote.delete({ where: { id: noteId } });
        return { success: true, message: "Note deleted." };
      },
    }),

    set_reminder: tool({
      description:
        "Set a reminder for the user. Use when user says 'remind me', 'set a reminder', 'alert me at'. Convert the user's local time to ISO 8601 using their timezone: " + tz,
      inputSchema: z.object({
        title: z.string().describe("Short description of what to remind about"),
        remindAt: z.string().describe("ISO 8601 datetime for when to remind (in user's timezone: " + tz + ")"),
        description: z.string().optional().describe("Longer description or context"),
        rrule: z.string().optional().describe("iCal RRULE string for recurring reminders (e.g., FREQ=WEEKLY;BYDAY=MO). Omit for one-time."),
      }),
      execute: async ({ title, remindAt, description, rrule }) => {
        // Validate date
        const remindDate = new Date(remindAt);
        if (isNaN(remindDate.getTime())) {
          return { success: false, error: "Invalid date format. Use ISO 8601 (e.g., 2026-02-19T14:00:00+05:30)." };
        }
        if (remindDate.getTime() <= Date.now()) {
          return { success: false, error: "Reminder time is in the past. Please set a future time." };
        }

        // Validate RRULE if provided
        if (rrule) {
          try {
            RRule.fromString(rrule);
          } catch {
            return { success: false, error: "Invalid RRULE format. Examples: FREQ=DAILY, FREQ=WEEKLY;BYDAY=MO" };
          }
        }

        const reminder = await prisma.reminder.create({
          data: {
            userId,
            title,
            description: description || null,
            remindAt: remindDate,
            timezone: tz,
            rrule: rrule || null,
            source: "whatsapp",
          },
        });

        const isRecurring = !!rrule;
        return {
          success: true,
          id: reminder.id,
          title: reminder.title,
          remindAt: reminder.remindAt.toISOString(),
          recurring: isRecurring,
          message: isRecurring
            ? `Recurring reminder set. You'll get pings 24 hours and 30 minutes before each occurrence.`
            : `Reminder set. You'll get pings 24 hours and 30 minutes before.`,
        };
      },
    }),

    list_reminders: tool({
      description: "List the user's reminders. Shows active reminders by default, sorted by upcoming time.",
      inputSchema: z.object({
        status: z.string().optional().describe("Filter by status: 'active', 'completed', or 'cancelled'. Default: 'active'."),
        limit: z.number().optional().describe("Max reminders to return. Default 10."),
      }),
      execute: async ({ status, limit }) => {
        const take = Math.min(limit || 10, 50);
        const reminders = await prisma.reminder.findMany({
          where: { userId, status: status || "active" },
          orderBy: { remindAt: "asc" },
          take,
          select: {
            id: true,
            title: true,
            description: true,
            remindAt: true,
            timezone: true,
            rrule: true,
            status: true,
            createdAt: true,
          },
        });

        return {
          reminders: reminders.map((r, i) => ({
            number: i + 1,
            id: r.id,
            title: r.title,
            description: r.description,
            remindAt: formatDisplayTime(r.remindAt, r.timezone),
            remindAtISO: r.remindAt.toISOString(),
            timezone: r.timezone,
            recurring: !!r.rrule,
            rrule: r.rrule,
            status: r.status,
          })),
          total: reminders.length,
        };
      },
    }),

    update_reminder: tool({
      description: "Update a reminder's title, time, description, or recurrence. If remindAt changes, notification flags are reset.",
      inputSchema: z.object({
        reminderId: z.string().describe("The ID of the reminder to update"),
        title: z.string().optional().describe("New title"),
        remindAt: z.string().optional().describe("New ISO 8601 datetime"),
        description: z.string().optional().describe("New description"),
        rrule: z.string().optional().describe("New RRULE or empty string to remove recurrence"),
      }),
      execute: async ({ reminderId, title, remindAt, description, rrule }) => {
        const reminder = await prisma.reminder.findFirst({
          where: { id: reminderId, userId, status: "active" },
        });
        if (!reminder) return { success: false, error: "Reminder not found or already completed/cancelled." };

        const data: any = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;

        if (remindAt !== undefined) {
          const newDate = new Date(remindAt);
          if (isNaN(newDate.getTime())) {
            return { success: false, error: "Invalid date format." };
          }
          if (newDate.getTime() <= Date.now()) {
            return { success: false, error: "Reminder time is in the past." };
          }
          data.remindAt = newDate;
          data.pingSent24h = false;
          data.pingSent30m = false;
        }

        if (rrule !== undefined) {
          if (rrule === "") {
            data.rrule = null;
          } else {
            try {
              RRule.fromString(rrule);
              data.rrule = rrule;
            } catch {
              return { success: false, error: "Invalid RRULE format." };
            }
          }
        }

        const updated = await prisma.reminder.update({
          where: { id: reminderId },
          data,
        });
        return { success: true, id: updated.id, title: updated.title, remindAt: updated.remindAt.toISOString() };
      },
    }),

    delete_reminder: tool({
      description: "Cancel a reminder (soft-delete). The reminder won't fire any more pings.",
      inputSchema: z.object({
        reminderId: z.string().describe("The ID of the reminder to cancel"),
      }),
      execute: async ({ reminderId }) => {
        const reminder = await prisma.reminder.findFirst({
          where: { id: reminderId, userId, status: "active" },
        });
        if (!reminder) return { success: false, error: "Reminder not found or already completed/cancelled." };

        await prisma.reminder.update({
          where: { id: reminderId },
          data: { status: "cancelled" },
        });
        return { success: true, message: "Reminder cancelled." };
      },
    }),
  };
}
