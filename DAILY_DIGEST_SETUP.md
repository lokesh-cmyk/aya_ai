# Daily Digest Agent Setup

## Overview

This document describes the Daily Digest Agent system that automatically sends project lifecycle summaries to team members every day at 8:00 AM in their local timezone.

## Architecture

### Components

1. **AgentKit Network** (`lib/agents/daily-digest-agent.ts`)
   - Uses `createNetwork` with a single agent for multi-tenancy support
   - Agent uses GPT-4o to generate structured daily digest emails
   - Collects project data via a custom tool
   - Formats emails with HTML styling

2. **Inngest Functions** (`lib/inngest/functions/daily-digest.ts`)
   - **Coordinator Function** (`sendDailyDigest`): Runs every hour via cron, identifies teams needing digests
   - **Multi-Tenant Processor** (`processTeamDigest`): Processes individual teams with concurrency limits per team
   - Generates one digest per team
   - Sends emails to all team members

3. **Email Template** (`lib/emails/daily-digest.ts`)
   - Wraps AI-generated content in professional email template
   - Uses Resend for email delivery

### Multi-Tenancy Configuration

The system is configured with multi-tenancy to ensure one team's usage doesn't affect another:

- **Concurrency Limit**: Maximum 3 concurrent operations per team
- **Tenant Key**: `teamId` - each team is isolated
- **Resource Isolation**: Teams cannot block each other's digest generation
- **Fair Allocation**: Resources are distributed fairly across all teams

This is implemented using Inngest's concurrency configuration:
```typescript
concurrency: [
  {
    key: "event.data.teamId",
    limit: 3,
  },
]
```

## Database Changes

### User Model Update

Added `timezone` field to User model:
```prisma
timezone String? @default("UTC") // IANA timezone (e.g., "America/New_York", "Europe/London")
```

**Migration Required:**
```bash
npx prisma generate
npx prisma migrate dev --name add_user_timezone
# Or
npx prisma db push
```

## How It Works

### 1. Data Collection

The agent collects:
- **Completed Yesterday**: Tasks that were finished the previous day
- **Due Today**: Tasks with due dates today
- **High Priority**: Tasks marked as HIGH or URGENT
- **In Progress**: Tasks currently being worked on
- **Recent Comments**: Comments added in the last 24 hours

### 2. Email Generation

The AgentKit agent:
1. Uses the `collect_project_data` tool to gather information
2. Structures the data into a professional email
3. Formats with HTML including:
   - Clear section headers
   - Bullet points
   - Priority indicators
   - Progress indicators

### 3. Scheduling

The Inngest function:
- Runs every hour (`0 * * * *` cron)
- Checks each user's timezone
- If it's 8:00 AM in a user's timezone, includes them
- Generates one digest per team
- Sends to all team members for consistency

## Configuration

### Environment Variables

Ensure these are set:
```env
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@yourdomain.com
APP_NAME=UnifiedBox
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### User Timezone Setup

Users can set their timezone (defaults to UTC). The timezone should be an IANA timezone identifier:
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
- `America/Los_Angeles`
- etc.

## Email Content

Each daily digest includes:

1. **Greeting**: "Good morning, [Team Name] team!"
2. **Summary**: Key metrics and overview
3. **Completed Yesterday**: What was accomplished
4. **Due Today**: Tasks requiring attention
5. **High Priority**: Urgent items
6. **In Progress**: Ongoing work
7. **Recent Updates**: Comments and activity
8. **Closing**: Encouraging note

## Testing

### Manual Testing

You can test the agent manually:

```typescript
import { generateDailyDigestEmail } from '@/lib/agents/daily-digest-agent';

const digest = await generateDailyDigestEmail(teamId, teamName);
console.log(digest.subject);
console.log(digest.html);
```

### Testing the Scheduled Function

1. Set a user's timezone to your current timezone
2. Manually trigger the Inngest function via the Inngest dashboard
3. Or wait for the next hour when it's 8 AM in that timezone

## Future Enhancements

### Second Agent (To Be Implemented)

The user mentioned setting up two agents. The second agent can be added following the same pattern:

1. Create agent in `lib/agents/`
2. Create Inngest function in `lib/inngest/functions/`
3. Register in `app/api/inngest/route.ts`

### Potential Improvements

- [ ] Allow users to customize digest frequency
- [ ] Add digest preferences (what to include/exclude)
- [ ] Support for multiple digest types (daily, weekly, etc.)
- [ ] Digest history and analytics
- [ ] Digest preview before sending
- [ ] Team-level digest settings

## Troubleshooting

### Emails Not Sending

1. Check Inngest dashboard for function execution
2. Verify Resend API key is set
3. Check user email verification status
4. Verify timezone is set correctly

### Agent Not Generating Content

1. Verify OpenAI API key is set
2. Check database connection
3. Ensure team has tasks/data
4. Check Inngest function logs

### Timezone Issues

1. Verify timezone format (IANA timezone identifier)
2. Check if `is8AMInTimezone` function is working
3. Consider running more frequently (every 15 minutes) for better accuracy

## Files Created/Modified

### New Files
- `lib/agents/daily-digest-agent.ts` - AgentKit network with agent and tools
- `lib/emails/daily-digest.ts` - Email sending function
- `lib/inngest/functions/daily-digest.ts` - Coordinator and multi-tenant processor functions

### Modified Files
- `prisma/schema.prisma` - Added timezone field
- `app/api/inngest/route.ts` - Registered new functions with multi-tenancy
- `package.json` - Added @inngest/agent-kit dependency

## Multi-Tenancy Benefits

✅ **Resource Isolation**: Each team's digest generation is isolated
✅ **Fair Resource Allocation**: No single team can consume all resources
✅ **Scalability**: System can handle multiple teams concurrently
✅ **Reliability**: One team's failure doesn't affect others
✅ **Performance**: Teams don't wait for each other unnecessarily

## Next Steps

1. **Run Database Migration**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name add_user_timezone
   ```

2. **Set User Timezones**
   - Add timezone selection to user settings
   - Or update users via database/API

3. **Test the System**
   - Manually trigger the function
   - Verify email delivery
   - Check email formatting

4. **Monitor**
   - Check Inngest dashboard for execution logs
   - Monitor email delivery rates
   - Review agent-generated content quality
