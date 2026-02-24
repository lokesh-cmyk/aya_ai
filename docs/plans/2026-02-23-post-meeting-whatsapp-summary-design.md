# Post-Meeting WhatsApp Summary — Design Document

**Date:** 2026-02-23
**Feature:** Automatically send a compact meeting summary with action items to users on WhatsApp, 15 minutes after meeting insights are generated.

## Overview

When a meeting ends and AYA generates insights (summary, action items, etc.), the system waits 15 minutes, then sends a formatted WhatsApp message to the meeting organizer (and optionally other participants). The message contains a concise executive summary and an actionable list of follow-ups.

## Requirements

- **Trigger:** 15 minutes after meeting insights are generated (not after the meeting ends, since insight generation is async)
- **Recipients:** Meeting organizer by default. Configurable to include additional participants.
- **Opt-in:** New `whatsappMeetingSummaryEnabled` flag on User model (default: false). Only users who enable this AND have a linked `whatsappPhone` receive summaries.
- **Duplicate prevention:** `whatsappSummarySentAt` timestamp on Meeting model prevents re-sends.
- **Format:** Compact WhatsApp message with meeting title, metadata, executive summary, and numbered action items.

## Architecture: Inngest Sleep Approach

After `generateMeetingInsights` completes, emit a `meeting/insights.ready` event. A new Inngest function listens for this event, sleeps 15 minutes, checks eligibility, formats the message, and sends via WAHA.

### Data Flow

```
generateMeetingInsights completes
  → status = COMPLETED
  → in-app notification sent
  → NEW: emit "meeting/insights.ready" event
      → sendMeetingWhatsAppSummary Inngest function
          → step.sleep("wait-15-minutes", "15m")
          → step.run("check-eligibility")
              - user has whatsappPhone?
              - user.whatsappMeetingSummaryEnabled = true?
              - meeting.whatsappSummarySentAt is null?
              - meeting still exists and is COMPLETED?
          → step.run("fetch-and-format")
              - load MeetingInsight records (summary, action_items)
              - load MeetingParticipant records
              - format WhatsApp message
          → step.run("send-whatsapp")
              - sendText() via WAHA
              - update meeting.whatsappSummarySentAt
```

## Database Changes

### User model — add field:
```prisma
whatsappMeetingSummaryEnabled Boolean @default(false)
```

### Meeting model — add field:
```prisma
whatsappSummarySentAt DateTime?  // Prevents duplicate sends
```

**Note:** Schema updates will be applied to `prisma/schema.prisma`. Migration and generation are handled manually by the developer.

## WhatsApp Message Format

```
*Meeting Summary: {title}*
_{date} | {duration} min | {participantCount} participants_

*Executive Summary*
{2-3 sentence summary from MeetingInsight type="summary"}

*Action Items*
1. {owner} - {task description}
2. {owner} - {task description}
...

_Sent by AYA_
```

- If no action items exist, omit that section entirely.
- If summary exceeds WhatsApp message limits, use existing `splitMessage()` utility.
- Date formatted in user's timezone.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `whatsappMeetingSummaryEnabled` to User, `whatsappSummarySentAt` to Meeting |
| `lib/inngest/functions/meeting-orchestration.ts` | Modify | Emit `meeting/insights.ready` event after insights generated |
| `lib/inngest/functions/meeting-whatsapp-summary.ts` | Create | New Inngest function: sleep 15 min, format, send |
| `lib/whatsapp/meeting-summary-formatter.ts` | Create | Format meeting insights into WhatsApp message text |
| `app/api/inngest/route.ts` | Modify | Register new `sendMeetingWhatsAppSummary` function |

## Error Handling

- **WAHA send fails:** Inngest auto-retries (up to 3 attempts with backoff)
- **User disabled feature during 15-min wait:** Eligibility check after sleep catches this — skip gracefully
- **Meeting deleted during wait:** Check meeting exists before sending — skip if not found
- **No summary/action_items insights:** Send message with summary only (action items section omitted)
- **No whatsappPhone on user:** Skip silently, log a debug message

## Future Considerations (Not in scope)

- Configurable participant recipient list (beyond organizer)
- User-configurable delay time (currently hardcoded to 15 min)
- Voice note summary alongside text
- "Reply to get more details" interactive flow
