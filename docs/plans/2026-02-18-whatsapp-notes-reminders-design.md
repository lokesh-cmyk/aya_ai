# WhatsApp Notes & Reminders — Design Document

**Date:** 2026-02-18
**Branch:** `feat/whatsapp-aya-integration`
**Approach:** Custom AI Tools + Inngest Cron Sweeper (1-min)

---

## Overview

Add personal notes and reminders to the WhatsApp AYA agent. Users can save notes ("save this — wifi password is BlueSky2024") and set reminders ("remind me to call the dentist tomorrow at 2pm") through natural conversation. The AI decides when to save or remind via tool calling — no rigid command syntax needed.

Reminders ping users on WhatsApp **24 hours before** and **30 minutes before** the scheduled time, in their local timezone. Both one-time and recurring reminders (daily, weekly, custom via iCal RRULE) are supported.

WhatsApp-first, but the DB schema supports a future web UI.

---

## Data Model

### UserNote

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

- `title` — AI-generated short title (optional, for listing)
- `tags` — AI-extracted keywords for search/filtering
- `source` — "whatsapp" now, "web" later
- `metadata` — flexible: `{ wahaMessageId, conversationId }`

### Reminder

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

- `remindAt` — stored in UTC; cron queries in UTC, display uses `timezone`
- `timezone` — user's IANA timezone at creation time
- `rrule` — null for one-time, iCal RRULE string for recurring (e.g., `FREQ=WEEKLY;BYDAY=MO`)
- `status` — "active" | "completed" | "cancelled"
- `pingSent24h` / `pingSent30m` — idempotency flags to prevent double-sends
- `lastPingAt` — audit trail for debugging

---

## AI Tools

Eight custom tools registered alongside Composio tools in the WhatsApp processor.

### Notes

| Tool | Parameters | Action |
|---|---|---|
| `save_note` | `content`, `title?`, `tags?` | Create UserNote. AI auto-generates title/tags if omitted. |
| `list_notes` | `search?`, `limit?` | List user's notes. Keyword search across content/title/tags. Default limit 10. |
| `update_note` | `noteId`, `content?`, `title?`, `tags?` | Update existing note. |
| `delete_note` | `noteId` | Hard-delete the note. |

### Reminders

| Tool | Parameters | Action |
|---|---|---|
| `set_reminder` | `title`, `remindAt` (ISO 8601), `description?`, `rrule?` | Create Reminder. AI converts natural language to ISO datetime + RRULE. |
| `list_reminders` | `status?`, `limit?` | List reminders sorted by next `remindAt`. Default: active only, limit 10. |
| `update_reminder` | `reminderId`, `title?`, `remindAt?`, `description?`, `rrule?` | Update reminder. Resets ping flags if `remindAt` changes. |
| `delete_reminder` | `reminderId` | Soft-delete: sets status to "cancelled". |

### Tool registration

Defined in `lib/whatsapp/tools.ts` as Vercel AI SDK `tool()` objects. Merged with Composio tools in the processor:

```typescript
const customTools = getNotesAndReminderTools(user.id, user.timezone);
const allTools = { ...composioTools, ...customTools };
```

### System prompt addition

```
## Notes & Reminders
You can save notes and set reminders for the user.
- "save this", "note this down", "remember that..." → use save_note
- "remind me", "set a reminder", "alert me at..." → use set_reminder
- Convert user's time to ISO 8601 using their timezone: {timezone}
- For recurring, generate iCal RRULE:
  - "every day" → FREQ=DAILY
  - "every weekday" → FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  - "every Monday" → FREQ=WEEKLY;BYDAY=MO
  - "every month on the 1st" → FREQ=MONTHLY;BYMONTHDAY=1
  - "every 2 weeks" → FREQ=WEEKLY;INTERVAL=2
  - "every day for 30 days" → FREQ=DAILY;COUNT=30
- Format notes/reminders as numbered lists so user can reference by #
- Before deleting, confirm with user
```

---

## Classifier Integration

Add keywords to `COMPLEX_KEYWORDS` in `classifier.ts`:

```
"note", "notes", "remind", "reminder", "reminders", "save this", "remember this"
```

These ensure note/reminder messages route through the complex path (Inngest queue) where `includeTools=true`.

---

## Reminder Delivery — Inngest Cron Sweeper

### Function: `whatsapp-reminder-delivery`

**Cron:** `* * * * *` (every minute)
**Concurrency:** 1 (prevents double-sends from overlapping runs)

### Algorithm

```
Every minute:
  1. Query active reminders where:
     - pingSent24h = false AND remindAt <= NOW() + 24 hours
     - OR pingSent30m = false AND remindAt <= NOW() + 30 minutes

  2. For each reminder:
     a. Look up user's whatsappPhone — skip if not linked
     b. Determine ping type:
        - Within 30 min AND pingSent30m = false → 30min ping
        - Within 24 hours AND pingSent24h = false → 24hr ping
     c. Format message in user's preferred language
     d. Send via WAHA sendText()
     e. Update ping flag + lastPingAt

  3. Post-delivery (remindAt has passed + both pings sent):
     - One-time: status = "completed"
     - Recurring: compute next remindAt from RRULE, reset ping flags
```

### Message formats

**24 hours before:**
```
⏰ *Reminder — Tomorrow*

📌 Team standup call
📅 Tomorrow at 9:00 AM (IST)

_You'll get another reminder 30 minutes before._
```

**30 minutes before:**
```
🔔 *Reminder — In 30 minutes!*

📌 Team standup call
📅 Today at 9:00 AM (IST)

_This is your final reminder._
```

### Recurring lifecycle

```
Create: remindAt = next Monday 9:00 AM, rrule = "FREQ=WEEKLY;BYDAY=MO"

Sunday 9:00 AM → 24hr ping, pingSent24h = true
Monday 8:30 AM → 30min ping, pingSent30m = true
Monday 9:01 AM → Compute next Monday 9:00 AM, reset flags, cycle repeats
```

### RRULE processing

Uses the `rrule` npm package (BSD, 45KB, no dependencies):

```typescript
import { RRule } from 'rrule';

function getNextOccurrence(rruleStr: string, after: Date): Date | null {
  const rule = RRule.fromString(rruleStr);
  return rule.after(after);
}
```

If `getNextOccurrence` returns null (COUNT exhausted, UNTIL passed), reminder is marked "completed".

---

## Error Handling

| Scenario | Handling |
|---|---|
| AI generates unparseable `remindAt` | Tool validates with `new Date()`, returns error, AI retries |
| AI generates invalid RRULE | Tool validates with `RRule.fromString()`, returns error, AI self-corrects |
| Reminder set in the past | Tool rejects with message |
| WAHA delivery fails during cron | Log error, do NOT flip ping flags — cron retries next minute |
| User has no WhatsApp linked | Cron skips (checks `whatsappPhone` exists) |
| 100+ due reminders at once | Process in batches of 20 with 500ms delay |
| RRULE computes no next occurrence | Mark reminder "completed" |
| Note content > 4000 chars | Tool truncates at 4000 chars, warns user |

---

## Security

- **Authorization**: Every tool scopes queries to `userId`. All reads/updates/deletes use `WHERE userId = ? AND id = ?` — no IDOR.
- **No tool access on simple path**: Tools only available when `includeTools=true` (complex path via Inngest).
- **Data storage**: Notes stored in plaintext (same security posture as WhatsApp messages and existing app data).

---

## Configuration

**No new environment variables.** Uses existing WAHA config and user timezone.

**New npm dependency:** `rrule` (BSD licensed)

---

## File Plan

### New files

| File | Purpose |
|---|---|
| `lib/whatsapp/tools.ts` | 8 custom AI tool definitions |
| `lib/inngest/functions/whatsapp-reminder-delivery.ts` | Cron sweeper for reminder pings |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `UserNote` + `Reminder` models, User relations |
| `lib/whatsapp/classifier.ts` | Add note/reminder keywords to COMPLEX_KEYWORDS |
| `lib/whatsapp/processor.ts` | Import custom tools, merge with Composio, extend system prompt |
| `app/api/inngest/route.ts` | Register `whatsappReminderDelivery` function |
| `package.json` | Add `rrule` dependency |

---

## Example Flows

### Save a note
```
User: "Save this — office wifi password is BlueSky2024"
Classifier: "save" → complex
Inngest queues → Processor loads tools
AI calls: save_note({ content: "Office wifi password is BlueSky2024", title: "Office WiFi Password", tags: ["wifi", "password", "office"] })
AI responds: "Saved! 📝 Note: *Office WiFi Password* — ask me to show your notes anytime."
```

### Set a one-time reminder
```
User: "Remind me to call the dentist tomorrow at 2pm"
Classifier: "remind" → complex
AI calls: set_reminder({ title: "Call the dentist", remindAt: "2026-02-19T14:00:00+05:30" })
AI responds: "Done! I'll remind you tomorrow at 2:00 PM. You'll get pings 24 hours and 30 minutes before. 📌"
```

### Set a recurring reminder
```
User: "Remind me every Monday at 9am to check weekly reports"
AI calls: set_reminder({ title: "Check weekly reports", remindAt: "2026-02-23T09:00:00+05:30", rrule: "FREQ=WEEKLY;BYDAY=MO" })
AI responds: "Set! Every Monday at 9:00 AM — check weekly reports. 🔁"
```

### List and delete
```
User: "Show my reminders"
AI calls: list_reminders({})
AI responds:
  "Your active reminders:
   1. 📌 Call the dentist — Tomorrow 2:00 PM
   2. 🔁 Check weekly reports — Every Mon 9:00 AM
   3. 📌 Submit tax forms — Feb 28 5:00 PM"

User: "Delete #1"
AI responds: "Delete reminder *Call the dentist* (Tomorrow 2:00 PM)? 🗑️"
User: "Yes"
AI calls: delete_reminder({ reminderId: "clx..." })
AI responds: "Done, reminder deleted. ✅"
```
