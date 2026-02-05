# Gmail Label Colors Configuration

## Overview

The Auto Email Management Agent automatically assigns colors to labels and categories in Gmail for easy visual identification. This makes it much easier to scan and organize your inbox.

## Label Color Scheme

### Work-Related Labels (Blue Theme)
- **Work**: `#1a73e8` (Blue) - Work emails
- **Projects**: `#4285f4` (Light Blue) - Project-related emails
- **Meetings**: `#34a853` (Green) - Meeting invitations and updates

### Priority Labels (Red/Orange/Yellow Theme)
- **Urgent**: `#ea4335` (Red) - Urgent emails requiring immediate attention
- **Important**: `#fbbc04` (Yellow/Orange) - Important emails
- **Follow-up**: `#ff6d01` (Orange) - Emails requiring follow-up action

### Personal Labels (Purple/Pink Theme)
- **Personal**: `#9334e6` (Purple) - Personal correspondence
- **Family**: `#e91e63` (Pink) - Family emails
- **Friends**: `#00bcd4` (Cyan) - Friend emails

### Financial Labels (Green/Red Theme)
- **Receipts**: `#4caf50` (Green) - Purchase receipts, confirmations
- **Bills**: `#f44336` (Red) - Bills and invoices
- **Invoices**: `#ff9800` (Orange) - Invoice documents

### Travel Labels (Teal/Indigo Theme)
- **Travel**: `#009688` (Teal) - Travel-related emails
- **Bookings**: `#3f51b5` (Indigo) - Booking confirmations
- **Itinerary**: `#00acc1` (Light Teal) - Travel itineraries

### Default
- **Unknown Labels**: `#5f6368` (Gray) - Default color for unrecognized labels

## Category Colors

Gmail categories also have distinct colors:

- **PRIMARY**: `#1a73e8` (Blue) - Important emails in main inbox
- **SOCIAL**: `#34a853` (Green) - Social media, forums, communities
- **PROMOTIONS**: `#ea4335` (Red) - Marketing, newsletters, deals
- **UPDATES**: `#fbbc04` (Yellow) - Receipts, confirmations, notifications
- **FORUMS**: `#9334e6` (Purple) - Discussion groups, mailing lists

## How It Works

### Automatic Color Assignment

1. **Label Creation**: When the agent creates a new label, it automatically assigns a color based on the label name
2. **Color Matching**: The system uses intelligent matching:
   - Exact name match (case-insensitive)
   - Partial match (e.g., "work-related" matches "Work")
   - Keyword matching (e.g., labels containing "urgent" get red color)
3. **Color Update**: If a label already exists, the agent attempts to update its color

### Color Format

Gmail API uses hex color format:
- **Background Color**: `#RRGGBB` (e.g., `#1a73e8`)
- **Text Color**: `#RRGGBB` (e.g., `#ffffff` for white text)

## Visual Benefits

✅ **Quick Scanning**: Color-coded labels make it easy to spot different types of emails at a glance
✅ **Organization**: Related emails are visually grouped by color
✅ **Priority Recognition**: Urgent (red) and important (yellow) emails stand out
✅ **Category Distinction**: Each Gmail category has its own color for easy identification

## Customization

### Adding New Label Colors

To add colors for new label types, update `LABEL_COLORS` in `lib/agents/email-management-agent.ts`:

```typescript
const LABEL_COLORS: Record<string, { backgroundColor: string; textColor: string }> = {
  "YourLabel": { backgroundColor: "#hexcolor", textColor: "#ffffff" },
  // ... existing colors
};
```

### Color Selection Guidelines

- **High Contrast**: Ensure text color contrasts well with background
- **Consistent Themes**: Group related labels with similar color families
- **Accessibility**: Use colors that are distinguishable for colorblind users
- **Gmail Compatibility**: Use standard hex format (#RRGGBB)

## MCP Tool Support

The implementation tries multiple parameter formats for MCP compatibility:
- `backgroundColor` / `textColor` (camelCase)
- `background_color` / `text_color` (snake_case)
- Falls back to creating label without color if color parameters aren't supported

## Troubleshooting

### Labels Not Showing Colors

1. **Check MCP Tool Support**: Verify that the Gmail MCP server supports color parameters
2. **Check Tool Names**: Ensure `gmail_create_label` and `gmail_update_label` are available
3. **Verify OAuth Permissions**: Gmail API requires `gmail.modify` scope for label creation
4. **Check Label Type**: Only user-created labels can have colors (not system labels)

### Colors Not Applied

1. **MCP Server Limitations**: Some MCP servers may not support color parameters
2. **Gmail API Version**: Ensure using Gmail API v1 which supports label colors
3. **Label Already Exists**: Existing labels may need manual color update in Gmail

## Best Practices

1. **Consistent Naming**: Use standard label names for automatic color matching
2. **Color Themes**: Stick to the color scheme for consistency
3. **Label Organization**: Create labels before applying them for better color control
4. **Regular Updates**: The agent will attempt to update label colors if they don't match

## Files Modified

- `lib/agents/email-management-agent.ts` - Added color mapping and color support in tools
