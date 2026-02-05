# Slack OAuth Setup Guide

This guide explains how to set up Slack OAuth integration with Pipedream Connect.

## Environment Variables

Add the following environment variable to your `.env` file:

```env
# Slack OAuth App ID from Pipedream
# This is the OAuth App ID you create in Pipedream for Slack integration
NEXT_PUBLIC_SLACK_OAUTH_APP_ID=oa_your_slack_oauth_app_id_here

# Optional: Also set it without NEXT_PUBLIC_ prefix for server-side use
SLACK_OAUTH_APP_ID=oa_your_slack_oauth_app_id_here
```

## Creating a Slack OAuth App in Pipedream

### Step 1: Create OAuth App in Pipedream

1. Log in to your [Pipedream account](https://pipedream.com)
2. Navigate to your project settings
3. Go to **Connect** → **OAuth Apps**
4. Click **Create OAuth App**
5. Select **Slack** as the platform
6. Configure the OAuth app:
   - **Name**: Your app name (e.g., "UnifiedBox Slack Integration")
   - **Redirect URI**: `http://localhost:3000/api/integrations/callback?platform=slack` (for development)
   - **Scopes**: Select the required Slack scopes:
     - `channels:read` - Read public channel information
     - `channels:history` - View messages in public channels
     - `groups:read` - Read private channel information (if needed)
     - `groups:history` - View messages in private channels (if needed)
     - `im:read` - Read direct messages (if needed)
     - `im:history` - View direct message history (if needed)
     - `users:read` - Read user information
7. Click **Create**
8. Copy the **OAuth App ID** (starts with `oa_`)

### Step 2: Add Environment Variable

Add the OAuth App ID to your `.env` file:

```env
NEXT_PUBLIC_SLACK_OAUTH_APP_ID=oa_your_oauth_app_id_here
```

### Step 3: Restart Your Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

1. **User clicks "Connect" on Slack** in the integrations page
2. **Pipedream Connect** opens OAuth flow with your custom OAuth App ID
3. **User authorizes** Slack access
4. **OAuth callback** saves tokens to database
5. **Channel selection dialog** appears (if channels are available)
6. **User selects channels** to monitor
7. **Selected channels** are saved to integration config
8. **Unified inbox** fetches messages from selected channels

## Required Slack Scopes

The following Slack scopes are required for the integration to work:

- `channels:read` - Read public channel information
- `channels:history` - View messages in public channels
- `groups:read` - Read private channel information (optional, for private channels)
- `groups:history` - View messages in private channels (optional)
- `users:read` - Read user information

## Troubleshooting

### OAuth App ID Not Found

If you see a warning about Slack OAuth App ID not being found:

1. Check that `NEXT_PUBLIC_SLACK_OAUTH_APP_ID` is set in your `.env` file
2. Restart your development server after adding the variable
3. Verify the OAuth App ID starts with `oa_`

### Connection Fails

If the Slack connection fails:

1. Verify the OAuth App ID is correct in Pipedream
2. Check that the redirect URI matches your app URL
3. Ensure all required scopes are selected in the OAuth app
4. Check browser console and server logs for detailed error messages

### Channels Not Loading

If channels don't load after connection:

1. Verify the Slack token has the required scopes
2. Check that the user has access to the channels
3. Review server logs for API errors

## Testing

1. Navigate to **Settings → Integrations**
2. Click **Connect** on the Slack card
3. Authorize the Slack workspace
4. Select channels to monitor
5. Check the unified inbox for Slack messages
