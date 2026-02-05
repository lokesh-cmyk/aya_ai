# Auto Email Management Agent Setup

## Overview

The Auto Email Management Agent automatically categorizes, labels, and segments emails in Gmail using AI-powered analysis. It runs in the background and organizes your inbox intelligently.

## Architecture

### Components

1. **MCP Gmail Client** (`lib/mcp/gmail-client.ts`)
   - Wraps Smithery MCP transport for Gmail
   - Handles OAuth token management
   - Connects to Gmail via MCP protocol

2. **AgentKit Network** (`lib/agents/email-management-agent.ts`)
   - **Email Management Agent**: AI agent that analyzes and organizes emails
   - **Tools**:
     - `fetch_emails`: Fetches emails from Gmail
     - `categorize_email`: Analyzes and categorizes emails
     - `label_email`: Applies labels to emails in Gmail (with automatic color assignment)
     - `create_colored_label`: Creates or updates labels with specific colors
     - `move_to_category`: Moves emails to Gmail categories (Primary, Social, Promotions, etc.) with colors
     - `segment_emails`: Groups emails by various criteria

3. **Inngest Functions** (`lib/inngest/functions/auto-email-management.ts`)
   - **Coordinator** (`autoEmailManagementCoordinator`): Runs every 15 minutes, finds users with Gmail
   - **Processor** (`autoEmailManagementProcessor`): Multi-tenant function that processes emails per user
   - **Manual Trigger** (`manualEmailProcessing`): On-demand email processing

4. **API Endpoint** (`app/api/emails/auto-manage/route.ts`)
   - Allows users to manually trigger email processing

### Multi-Tenancy Configuration

The system is configured with multi-tenancy to ensure one user's email processing doesn't affect another:

- **Concurrency Limit**: Maximum 2 concurrent operations per user
- **Tenant Key**: `userId` - each user is isolated
- **Resource Isolation**: Users cannot block each other's email processing
- **Fair Allocation**: Resources are distributed fairly across all users

## Features

### Auto-Categorization

The agent automatically categorizes emails into:
- **Primary**: Important personal and work emails
- **Social**: Social media notifications, forums, communities
- **Promotions**: Marketing emails, newsletters, deals
- **Updates**: Order confirmations, receipts, notifications
- **Work**: Work-related emails
- **Personal**: Personal correspondence
- **Spam**: Suspicious or unwanted emails

### Auto-Labeling with Colors

Applies intelligent labels with distinct colors for easy visual identification:
- **Work labels (Blue)**: "Work", "Projects", "Meetings"
- **Priority labels (Red/Yellow/Orange)**: "Important", "Urgent", "Follow-up"
- **Personal labels (Purple/Pink)**: "Personal", "Family", "Friends"
- **Financial labels (Green/Red)**: "Receipts", "Bills", "Invoices"
- **Travel labels (Teal/Indigo)**: "Travel", "Bookings", "Itinerary"
- Custom labels based on content analysis (with appropriate colors)

### Auto-Segmentation

Groups emails by:
- **Sender**: Emails from the same sender
- **Subject**: Emails with similar subjects
- **Date**: Emails from the same time period
- **Importance**: Priority-based grouping
- **Category**: Category-based grouping

### Gmail Integration with Colors

Directly modifies emails in Gmail with colorful labels:
- Applies labels with distinct colors for easy identification
- Moves to categories (each with distinct colors):
  - PRIMARY (blue) - Important emails
  - SOCIAL (green) - Social media, forums
  - PROMOTIONS (red) - Marketing, newsletters
  - UPDATES (yellow) - Receipts, confirmations
  - FORUMS (purple) - Discussion groups
- Organizes inbox automatically with visual color coding

## Setup

### Prerequisites

1. **Gmail Account Connected**
   - Users must connect their Gmail account via the Integrations page
   - OAuth tokens are stored securely in the database

2. **Environment Variables**

   No additional environment variables needed - uses existing Gmail OAuth setup.

### Installation

The required packages are already installed:
- `@modelcontextprotocol/sdk` - MCP SDK
- `@smithery/api` - Smithery MCP transport

### How It Works

1. **Automatic Processing** (Every 15 minutes):
   - Coordinator function runs
   - Finds all users with active Gmail integrations
   - Triggers processing for each user
   - Each user's emails are processed independently

2. **Manual Processing**:
   - User can trigger via API endpoint: `POST /api/emails/auto-manage`
   - Or via Inngest event: `email/manual-process`

3. **Email Processing**:
   - Agent fetches recent unread emails
   - Analyzes each email (subject, sender, content)
   - Determines category and applies labels
   - Moves to appropriate Gmail category
   - Segments emails into logical groups

## Usage

### For Users

1. **Connect Gmail**:
   - Go to Settings → Integrations
   - Click "Connect" on Gmail
   - Authorize access

2. **Automatic Processing**:
   - Emails are automatically processed every 15 minutes
   - No action required

3. **Manual Processing**:
   - Call the API endpoint to process immediately:
   ```bash
   POST /api/emails/auto-manage
   ```

### For Developers

#### Trigger Manual Processing

```typescript
import { inngest } from '@/lib/inngest/client';

await inngest.send({
  name: "email/manual-process",
  data: {
    userId: "user-id",
    teamId: "team-id", // optional
  },
});
```

#### Process Emails Programmatically

```typescript
import { processUserEmails } from '@/lib/agents/email-management-agent';

const result = await processUserEmails(userId, teamId);
console.log(`Processed ${result.actions} email actions`);
```

## Email Categories

The agent recognizes and applies these Gmail categories:

- **PRIMARY**: Important emails (default inbox)
- **SOCIAL**: Social media, forums, communities
- **PROMOTIONS**: Marketing, newsletters, deals
- **UPDATES**: Receipts, confirmations, notifications
- **FORUMS**: Discussion groups, mailing lists

## Custom Labels

The agent intelligently creates and applies labels based on:
- Email content analysis
- Sender patterns
- Subject keywords
- User behavior (learned over time)

Common labels with colors:
- **Work-related (Blue)**: "Work" (#1a73e8), "Projects" (#4285f4), "Meetings" (#34a853)
- **Personal (Purple/Pink)**: "Personal" (#9334e6), "Family" (#e91e63), "Friends" (#00bcd4)
- **Priority (Red/Yellow/Orange)**: "Important" (#fbbc04), "Urgent" (#ea4335), "Follow-up" (#ff6d01)
- **Financial (Green/Red)**: "Receipts" (#4caf50), "Bills" (#f44336), "Invoices" (#ff9800)
- **Travel (Teal/Indigo)**: "Travel" (#009688), "Bookings" (#3f51b5), "Itinerary" (#00acc1)

All labels are automatically assigned colors when created, making them easily visible in Gmail!

## Multi-Tenancy Benefits

✅ **Resource Isolation**: Each user's email processing is isolated
✅ **Fair Resource Allocation**: No single user can consume all resources
✅ **Scalability**: System can handle multiple users concurrently
✅ **Reliability**: One user's failure doesn't affect others
✅ **Performance**: Users don't wait for each other unnecessarily

## Configuration

### Processing Frequency

Default: Every 15 minutes

To change, modify the cron schedule in `autoEmailManagementCoordinator`:
```typescript
{ cron: "*/15 * * * *" } // Every 15 minutes
```

### Concurrency Limits

Default: 2 concurrent operations per user

To change, modify in `autoEmailManagementProcessor`:
```typescript
concurrency: [
  {
    key: "event.data.userId",
    limit: 2, // Adjust as needed
  },
]
```

## Troubleshooting

### Emails Not Being Processed

1. **Check Gmail Connection**:
   - Verify Gmail is connected in Settings → Integrations
   - Check if integration is active

2. **Check Inngest Dashboard**:
   - View function execution logs
   - Check for errors in coordinator or processor

3. **Verify OAuth Token**:
   - Ensure Gmail OAuth token is valid
   - Reconnect Gmail if token expired

### MCP Connection Issues

1. **Check Smithery Service**:
   - Verify `https://server.smithery.ai/gmail` is accessible
   - Check Smithery service status

2. **Verify OAuth Token**:
   - Token must be valid and not expired
   - Token must have Gmail API permissions

3. **Check Network**:
   - Ensure server can reach Smithery MCP server
   - Check firewall/proxy settings

### Label/Category Not Applied

1. **Check Gmail Permissions**:
   - OAuth token must have `gmail.modify` scope
   - Verify permissions in Gmail account settings

2. **Check MCP Tool Availability**:
   - Verify MCP tools are available: `gmail_list_labels`, `gmail_modify_message`
   - Check Smithery MCP server status

## Files Created/Modified

### New Files
- `lib/mcp/gmail-client.ts` - MCP client wrapper for Gmail
- `lib/agents/email-management-agent.ts` - AgentKit network and agent
- `lib/inngest/functions/auto-email-management.ts` - Inngest functions
- `app/api/emails/auto-manage/route.ts` - Manual trigger API endpoint

### Modified Files
- `app/api/inngest/route.ts` - Registered new functions
- `package.json` - Added MCP SDK and Smithery packages

## Future Enhancements

- [ ] User preferences for categorization rules
- [ ] Custom label templates
- [ ] Email filtering rules
- [ ] Priority-based processing
- [ ] Batch processing for large inboxes
- [ ] Analytics and reporting
- [ ] Learning from user corrections
- [ ] Integration with other email providers (Outlook, etc.)

## Security & Privacy

- ✅ OAuth tokens stored securely in database
- ✅ Each user's emails processed independently
- ✅ No cross-user data access
- ✅ Multi-tenant isolation enforced
- ✅ All operations logged for audit

## API Reference

### Manual Processing

**Endpoint**: `POST /api/emails/auto-manage`

**Authentication**: Required (session)

**Response**:
```json
{
  "success": true,
  "message": "Email processing triggered successfully"
}
```

### Inngest Events

**Event**: `email/auto-manage`
```typescript
{
  userId: string;
  teamId?: string | null;
}
```

**Event**: `email/manual-process`
```typescript
{
  userId: string;
  teamId?: string | null;
}
```
