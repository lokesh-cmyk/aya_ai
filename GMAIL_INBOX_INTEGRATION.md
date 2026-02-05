# Gmail Inbox Integration via MCP

## Overview

The unified inbox now fetches and displays Gmail emails directly using the MCP (Model Context Protocol) client. Gmail emails are seamlessly integrated with existing contacts and messages.

## Implementation

### 1. **API Endpoint** (`app/api/emails/gmail/route.ts`)
- Fetches emails from Gmail using MCP
- Formats emails for unified inbox display
- Groups emails by sender (email address)
- Returns contact-like structure compatible with inbox

### 2. **Inbox Components Updated**
- **KinsoInbox** (`components/inbox/KinsoInbox.tsx`): Fetches and displays Gmail emails
- **UnifiedInbox** (`components/inbox/UnifiedInbox.tsx`): Merges Gmail emails with regular contacts

### 3. **Features**

#### Email Fetching
- Uses MCP Gmail client to fetch emails
- Supports Gmail search queries
- Configurable max results (default: 50)
- Automatic retry on failure

#### Email Formatting
- Groups emails by sender email address
- Creates contact-like structure for each sender
- Includes email metadata (subject, labels, thread ID)
- Preserves Gmail-specific information

#### Contact Merging
- **Smart Merging**: If a Gmail sender already exists as a contact, messages are merged
- **New Contacts**: Gmail senders without existing contacts are added as new contacts
- **Gmail Badge**: Gmail emails are marked with a "Gmail" badge
- **Subject Display**: Gmail emails show subject line prominently

## Usage

### Automatic Integration

Gmail emails are automatically fetched and displayed in the inbox when:
1. User has Gmail connected (via Settings → Integrations)
2. User visits the inbox page
3. Emails refresh every 10 seconds (configurable)

### Manual Refresh

The inbox automatically refetches Gmail emails:
- Every 10 seconds (KinsoInbox)
- Every 5 seconds (UnifiedInbox)
- On search query changes
- On component mount

### Search Integration

Gmail search queries are supported:
- Basic search: `in:inbox`
- With search term: `in:inbox search term`
- Gmail search syntax: `from:example.com`, `subject:important`, etc.

## Email Data Structure

Gmail emails are formatted as:

```typescript
{
  id: "gmail-email@example.com",
  name: "Sender Name",
  email: "email@example.com",
  isGmail: true,
  messages: [
    {
      id: "gmail-message-id",
      content: "Email snippet/preview",
      channel: "EMAIL",
      direction: "INBOUND",
      createdAt: "2024-01-01T00:00:00Z",
      readAt: null, // or timestamp if read
      subject: "Email Subject",
      from: "sender@example.com",
      labels: ["UNREAD", "INBOX"],
      metadata: {
        gmailId: "message-id",
        threadId: "thread-id",
        labels: ["UNREAD", "INBOX"]
      }
    }
  ],
  _count: { messages: 1 }
}
```

## Visual Indicators

### Gmail Badge
- Red badge with "Gmail" text
- Appears next to contact name
- Indicates email is from Gmail

### Subject Display
- Gmail emails show subject line prominently
- Subject appears before email content
- Helps identify email purpose quickly

### Channel Icon
- EMAIL channel icon (📧) displayed
- Consistent with other message channels

## MCP Tool Names

The implementation tries multiple possible MCP tool names:
- `gmail_list_messages`
- `gmail_list_emails`
- `list_messages`
- `get_messages`
- `gmail_messages_list`

**Note**: The actual tool names depend on the Smithery Gmail MCP server implementation. The code will try each name until one works.

## Error Handling

### Graceful Degradation
- If Gmail is not connected, inbox still works with other contacts
- If MCP connection fails, returns empty array (no error thrown)
- Logs warnings instead of breaking the UI

### Error Scenarios
1. **Gmail Not Connected**: Returns empty contacts array
2. **MCP Connection Failed**: Logs error, returns empty array
3. **Invalid Tool Name**: Tries next tool name in list
4. **OAuth Token Expired**: Returns error, user needs to reconnect

## Performance

### Caching
- React Query caches Gmail emails
- Refetch interval: 10 seconds (KinsoInbox) or 5 seconds (UnifiedInbox)
- Reduces unnecessary API calls

### Optimization
- Only fetches when user is authenticated
- Limits results to 50 emails by default
- Groups emails by sender to reduce duplicates

## Future Enhancements

- [ ] Real-time email updates via webhooks
- [ ] Gmail label filtering
- [ ] Thread grouping
- [ ] Email actions (reply, archive, delete)
- [ ] Gmail search UI
- [ ] Email attachments display
- [ ] Read/unread status sync
- [ ] Gmail category filtering

## Troubleshooting

### Gmail Emails Not Showing

1. **Check Gmail Connection**:
   - Go to Settings → Integrations
   - Verify Gmail is connected and active

2. **Check Browser Console**:
   - Look for MCP connection errors
   - Check for OAuth token issues

3. **Verify MCP Tools**:
   - Check if Smithery Gmail MCP server is accessible
   - Verify tool names match implementation

4. **Check Network**:
   - Ensure server can reach `https://server.smithery.ai/gmail`
   - Check firewall/proxy settings

### Emails Not Merging

- Emails merge based on email address (case-insensitive)
- If email addresses don't match exactly, they appear as separate contacts
- Check email address format in both Gmail and regular contacts

## API Reference

### Endpoint: `GET /api/emails/gmail`

**Query Parameters**:
- `maxResults` (number, default: 50): Maximum number of emails to fetch
- `query` (string, optional): Gmail search query

**Response**:
```json
{
  "contacts": [
    {
      "id": "gmail-email@example.com",
      "name": "Sender Name",
      "email": "email@example.com",
      "isGmail": true,
      "messages": [...],
      "_count": { "messages": 1 }
    }
  ],
  "total": 1
}
```

## Files Modified

- `app/api/emails/gmail/route.ts` - New API endpoint
- `components/inbox/KinsoInbox.tsx` - Added Gmail fetching
- `components/inbox/UnifiedInbox.tsx` - Added Gmail merging

## Dependencies

- `@modelcontextprotocol/sdk` - MCP client
- `@smithery/api` - Smithery transport
- `lib/mcp/gmail-client.ts` - MCP client wrapper (already created)
