# WhatsApp Notes & Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add personal notes and reminders to the WhatsApp AYA agent via custom AI tools and an Inngest cron sweeper for reminder delivery.

**Architecture:** 8 custom AI tools (save_note, set_reminder, list/update/delete for both) are registered alongside Composio tools in the WhatsApp processor. An Inngest cron function runs every minute, queries reminders due within the 24hr/30min windows, and sends WhatsApp pings via WAHA. Recurring reminders use iCal RRULE via the `rrule` npm package.

**Tech Stack:** Prisma (PostgreSQL), Vercel AI SDK `tool()`, Inngest cron, `rrule` npm package, WAHA sendText

---

### Task 1: Install rrule dependency

**Files:**
- Modify: `package.json`

**Step 1: Install rrule**

Run: `npm install rrule`

**Step 2: Verify installation**

Run: `node -e "const { RRule } = require('rrule'); console.log(RRule.fromString('FREQ=WEEKLY;BYDAY=MO').toString())"`
Expected: Outputs the RRULE string without error

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add rrule dependency for recurring reminders"
```

---

### Task 2: Add Prisma schema — UserNote and Reminder models

**Files:**
- Modify: `prisma/schema.prisma` — add 2 new models + 2 User relations

**Step 1: Add User relations**

In `prisma/schema.prisma`, inside the `User` model (after line 93 `whatsappConversations WhatsAppConversation[]`), add:

```prisma
  userNotes             UserNote[]
  reminders             Reminder[]
```

**Step 2: Add UserNote model**

Append after the `WhatsAppMessage` model (after line 788):

```prisma

model UserNote {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?
  content   String
  tags      String[]
  source    String   @default("whatsapp")
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([createdAt])
}
```

**Step 3: Add Reminder model**

Append after UserNote:

```prisma

model Reminder {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  remindAt     DateTime
  timezone     String
  rrule        String?
  status       String    @default("active")
  pingSent24h  Boolean   @default(false)
  pingSent30m  Boolean   @default(false)
  lastPingAt   DateTime?
  source       String    @default("whatsapp")
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([userId])
  @@index([status, remindAt])
  @@index([remindAt])
}
```

**Step 4: Generate Prisma client (do NOT run migrate — migration will be run separately)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add UserNote and Reminder models for WhatsApp notes & reminders"
```

---

### Task 3: Create custom AI tools — `lib/whatsapp/tools.ts`

**Files:**
- Create: `lib/whatsapp/tools.ts`

**Context:**
- Tools use Vercel AI SDK `tool()` function from `"ai"` package
- Each tool receives `userId` and `timezone` via closure (from `getNotesAndReminderTools(userId, timezone)`)
- All DB queries are scoped to `userId` for authorization
- The `set_reminder` tool must validate `remindAt` is in the future and validate `rrule` with the `rrule` package
- The `update_reminder` tool must reset `pingSent24h`/`pingSent30m` flags when `remindAt` changes
- The `delete_reminder` tool soft-deletes (sets status to "cancelled")
- The `delete_note` tool hard-deletes
- `list_notes` supports keyword search across `content`, `title`, and `tags`
- `list_reminders` returns active reminders sorted by `remindAt` ascending
- Return type is `ToolSet` (from `"ai"` package): `Record<string, CoreTool>`

**Step 1: Create the tools file**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";

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
      parameters: z.object({
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
            tags: tags || [],
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
      parameters: z.object({
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
      parameters: z.object({
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
        if (tags !== undefined) data.tags = tags;

        const updated = await prisma.userNote.update({
          where: { id: noteId },
          data,
        });
        return { success: true, id: updated.id, title: updated.title };
      },
    }),

    delete_note: tool({
      description: "Delete a note permanently. Confirm with the user before calling this.",
      parameters: z.object({
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
      parameters: z.object({
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
      parameters: z.object({
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
            remindAt: r.remindAt.toISOString(),
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
      parameters: z.object({
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
      parameters: z.object({
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit lib/whatsapp/tools.ts 2>&1 | head -20`
Expected: No errors (or only unrelated project-wide errors)

**Step 3: Commit**

```bash
git add lib/whatsapp/tools.ts
git commit -m "feat(whatsapp): add custom AI tools for notes and reminders CRUD"
```

---

### Task 4: Update classifier — add note/reminder keywords

**Files:**
- Modify: `lib/whatsapp/classifier.ts:9-27` — add entries to `COMPLEX_KEYWORDS` array

**Step 1: Add keywords**

Add a new section to the `COMPLEX_KEYWORDS` array (after the `// Meetings` block, before the closing `];` on line 27):

```typescript
  // Notes & Reminders
  "note", "notes", "remind", "reminder", "reminders",
  "save this", "remember this", "note this",
```

**Step 2: Verify classifier routes correctly**

Run: `node -e "
const { classifyIntent } = require('./lib/whatsapp/classifier');
console.log('remind me:', classifyIntent('remind me to call dentist'));
console.log('save this:', classifyIntent('save this wifi password'));
console.log('my notes:', classifyIntent('show my notes'));
console.log('hello:', classifyIntent('hello'));
"`
Expected:
```
remind me: complex
save this: complex
my notes: complex
hello: simple
```

**Step 3: Commit**

```bash
git add lib/whatsapp/classifier.ts
git commit -m "feat(whatsapp): add note/reminder keywords to intent classifier"
```

---

### Task 5: Integrate tools into processor

**Files:**
- Modify: `lib/whatsapp/processor.ts`
  - Add import for `getNotesAndReminderTools` (line 13 area)
  - Merge custom tools with Composio tools (lines 101-110 area)
  - Extend system prompt (lines 410-421 area)

**Step 1: Add import**

After line 13 (the `classifier` import), add:

```typescript
import { getNotesAndReminderTools } from "./tools";
```

**Step 2: Merge custom tools with Composio tools**

Replace lines 101-110 (the tool-loading block):

```typescript
    // Load tools if complex path
    let tools: any = {};
    if (includeTools) {
      try {
        const sessionTools = await getComposioSessionTools(user.id);
        tools = sessionTools.tools;
      } catch (e) {
        console.warn("[whatsapp] Failed to load Composio tools:", e);
      }
    }
```

With:

```typescript
    // Load tools if complex path
    let tools: any = {};
    if (includeTools) {
      // Always add notes & reminders tools on complex path
      const customTools = getNotesAndReminderTools(user.id, user.timezone);
      tools = { ...customTools };

      // Add Composio tools (external integrations)
      try {
        const sessionTools = await getComposioSessionTools(user.id);
        tools = { ...tools, ...sessionTools.tools };
      } catch (e) {
        console.warn("[whatsapp] Failed to load Composio tools:", e);
      }
    }
```

**Step 3: Extend system prompt**

In `buildWhatsAppSystemPrompt()`, after the `## Your Capabilities` section (after line 420 `- Connected integrations (Google Calendar, ClickUp, Slack, Instagram, LinkedIn)`), add:

```typescript
- Personal notes (save, search, update, delete)
- Reminders with WhatsApp pings (one-time and recurring)

## Notes & Reminders
- When user says "save this", "note this down", "remember that..." → use save_note tool
- When user says "remind me", "set a reminder", "alert me at..." → use set_reminder tool
- For reminders, convert the user's local time to ISO 8601 using their timezone: ${user.timezone || "UTC"}
- Current date/time: ${new Date().toISOString()}
- For recurring reminders, generate an iCal RRULE string:
  - "every day" → FREQ=DAILY
  - "every weekday" → FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  - "every Monday" → FREQ=WEEKLY;BYDAY=MO
  - "every Monday and Wednesday" → FREQ=WEEKLY;BYDAY=MO,WE
  - "every month on the 1st" → FREQ=MONTHLY;BYMONTHDAY=1
  - "every 2 weeks" → FREQ=WEEKLY;INTERVAL=2
  - "every day for 30 days" → FREQ=DAILY;COUNT=30
- When listing notes or reminders, show numbered list so user can reference by # (e.g., "delete #2")
- Before deleting a note or cancelling a reminder, confirm with the user first
`;
```

Note: The `## Your Capabilities` bullet list already ends with the integrations line, so append the two new bullets, then add the full `## Notes & Reminders` section as a new block before the closing backtick.

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep -i "whatsapp/processor\|whatsapp/tools" | head -10`
Expected: No errors from these files

**Step 5: Commit**

```bash
git add lib/whatsapp/processor.ts
git commit -m "feat(whatsapp): integrate notes & reminders tools into AI processor"
```

---

### Task 6: Create Inngest reminder delivery cron — `lib/inngest/functions/whatsapp-reminder-delivery.ts`

**Files:**
- Create: `lib/inngest/functions/whatsapp-reminder-delivery.ts`

**Context:**
- Follow the same pattern as `whatsapp-session-health.ts` (Inngest cron with `createFunction`)
- Inngest client import: `import { inngest } from "../client";`
- WAHA sendText import: `import { sendText, toChatId } from "@/lib/integrations/waha";`
- Query active reminders where 24hr or 30min ping is due
- For recurring reminders, use `rrule` package to compute next occurrence
- Format reminder messages with timezone-aware display time using `Intl.DateTimeFormat`
- Concurrency: 1 (prevent double-sends)
- Batch processing: 20 reminders at a time with 500ms delay between batches

**Step 1: Create the file**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendText, toChatId } from "@/lib/integrations/waha";
import { RRule } from "rrule";

/**
 * Inngest cron function that runs every minute to deliver WhatsApp reminder pings.
 * Sends pings 24 hours before and 30 minutes before each reminder's scheduled time.
 * Handles recurring reminders by advancing remindAt to the next occurrence.
 */
export const whatsappReminderDelivery = inngest.createFunction(
  {
    id: "whatsapp-reminder-delivery",
    concurrency: { limit: 1 },
  },
  { cron: "* * * * *" },
  async ({ step }) => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in30m = new Date(now.getTime() + 30 * 60 * 1000);

    // Find reminders that need a ping
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
          user: {
            select: {
              id: true,
              whatsappPhone: true,
              name: true,
            },
          },
        },
        take: 100,
        orderBy: { remindAt: "asc" },
      });
    });

    if (dueReminders.length === 0) return { sent: 0 };

    let totalSent = 0;

    // Process in batches of 20
    for (let i = 0; i < dueReminders.length; i += 20) {
      const batch = dueReminders.slice(i, i + 20);

      await step.run(`send-batch-${Math.floor(i / 20)}`, async () => {
        for (const reminder of batch) {
          const phone = reminder.user.whatsappPhone;
          if (!phone) continue;

          const chatId = toChatId(phone);
          const displayTime = formatReminderTime(reminder.remindAt, reminder.timezone);
          const isRecurring = !!reminder.rrule;

          try {
            // Determine which ping to send (prefer 30min if both are due)
            if (!reminder.pingSent30m && reminder.remindAt.getTime() <= in30m.getTime()) {
              // 30-minute ping
              const message = [
                `🔔 *Reminder — In 30 minutes!*`,
                ``,
                `📌 ${reminder.title}`,
                ...(reminder.description ? [`_${reminder.description}_`] : []),
                `📅 ${displayTime}`,
                ...(isRecurring ? [`🔁 _Recurring_`] : []),
                ``,
                `_This is your final reminder._`,
              ].join("\n");

              await sendText(chatId, message);
              await prisma.reminder.update({
                where: { id: reminder.id },
                data: { pingSent30m: true, lastPingAt: new Date() },
              });
              totalSent++;
            } else if (!reminder.pingSent24h && reminder.remindAt.getTime() <= in24h.getTime()) {
              // 24-hour ping
              const message = [
                `⏰ *Reminder — Tomorrow*`,
                ``,
                `📌 ${reminder.title}`,
                ...(reminder.description ? [`_${reminder.description}_`] : []),
                `📅 ${displayTime}`,
                ...(isRecurring ? [`🔁 _Recurring_`] : []),
                ``,
                `_You'll get another reminder 30 minutes before._`,
              ].join("\n");

              await sendText(chatId, message);
              await prisma.reminder.update({
                where: { id: reminder.id },
                data: { pingSent24h: true, lastPingAt: new Date() },
              });
              totalSent++;
            }
          } catch (e) {
            console.error(`[reminder-delivery] Failed to send ping for reminder ${reminder.id}:`, e);
            // Do NOT update flags — cron will retry next minute
          }
        }
      });

      // Delay between batches to avoid WAHA rate limits
      if (i + 20 < dueReminders.length) {
        await step.sleep("batch-delay", "500ms");
      }
    }

    // Handle completed/recurring reminders (remindAt has passed and both pings sent)
    await step.run("advance-completed-reminders", async () => {
      const passedReminders = await prisma.reminder.findMany({
        where: {
          status: "active",
          pingSent30m: true,
          remindAt: { lte: now },
        },
      });

      for (const reminder of passedReminders) {
        if (reminder.rrule) {
          // Recurring: advance to next occurrence
          const nextDate = getNextOccurrence(reminder.rrule, reminder.remindAt);
          if (nextDate) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                remindAt: nextDate,
                pingSent24h: false,
                pingSent30m: false,
              },
            });
          } else {
            // No more occurrences (COUNT exhausted / UNTIL passed)
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "completed" },
            });
          }
        } else {
          // One-time: mark completed
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

/**
 * Format a reminder time for display in the user's timezone.
 */
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

/**
 * Compute the next occurrence of a recurring reminder using RRULE.
 */
function getNextOccurrence(rruleStr: string, after: Date): Date | null {
  try {
    const rule = RRule.fromString(rruleStr);
    // Get the next occurrence after the given date
    const next = rule.after(after, false);
    return next;
  } catch {
    return null;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "reminder-delivery" | head -5`
Expected: No errors from this file

**Step 3: Commit**

```bash
git add lib/inngest/functions/whatsapp-reminder-delivery.ts
git commit -m "feat(inngest): add cron sweeper for WhatsApp reminder delivery"
```

---

### Task 7: Register Inngest function

**Files:**
- Modify: `app/api/inngest/route.ts`

**Step 1: Add import**

After line 24 (`import { wahaSessionHealthCheck }...`), add:

```typescript
import { whatsappReminderDelivery } from "@/lib/inngest/functions/whatsapp-reminder-delivery";
```

**Step 2: Add to functions array**

In the `functions` array, after `wahaSessionHealthCheck` (line 51), add:

```typescript
    whatsappReminderDelivery, // Cron: WhatsApp reminder pings (every minute)
```

**Step 3: Commit**

```bash
git add app/api/inngest/route.ts
git commit -m "feat(inngest): register whatsappReminderDelivery cron function"
```

---

### Task 8: Review and verify full integration

**Files:**
- All files from Tasks 1-7

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No new errors introduced by our changes

**Step 2: Verify Prisma schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Verify all imports resolve**

Run: `node -e "
try { require('./lib/whatsapp/tools'); console.log('tools: OK'); } catch(e) { console.log('tools: FAIL', e.message); }
try { require('./lib/whatsapp/classifier'); console.log('classifier: OK'); } catch(e) { console.log('classifier: FAIL', e.message); }
"`
Expected: Both OK (or expected module resolution errors in non-Next.js context — @ aliases won't resolve in bare node)

**Step 4: Manually verify the code review checklist**

- [ ] All DB queries in tools scoped to `userId` (no IDOR)
- [ ] `set_reminder` validates date is in future
- [ ] `set_reminder` validates RRULE with `RRule.fromString()`
- [ ] `update_reminder` resets ping flags when `remindAt` changes
- [ ] `delete_reminder` soft-deletes (status = "cancelled")
- [ ] `delete_note` hard-deletes
- [ ] Cron sweeper has concurrency limit of 1
- [ ] Cron does NOT update ping flags on WAHA send failure (allows retry)
- [ ] Recurring reminders advance `remindAt` and reset flags after completion
- [ ] Recurring reminders marked "completed" when RRULE exhausted
- [ ] System prompt includes current datetime for AI time reasoning
- [ ] Custom tools merged BEFORE Composio tools (custom take priority)
- [ ] Note content truncated at 4000 chars
- [ ] Reminder display time uses `Intl.DateTimeFormat` with user's timezone

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review findings in notes & reminders implementation"
```
