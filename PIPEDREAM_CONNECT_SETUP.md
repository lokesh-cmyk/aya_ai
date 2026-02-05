# Pipedream Connect Setup Guide

This guide will help you set up Pipedream Connect for OAuth integrations in UnifiedBox.

## Prerequisites

1. A Pipedream account (sign up at [pipedream.com](https://pipedream.com))
2. A Pipedream project created at [pipedream.com/projects](https://pipedream.com/projects)
3. OAuth client credentials from your Pipedream workspace

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Pipedream Connect Configuration
PIPEDREAM_CLIENT_ID=your_client_id_here
PIPEDREAM_CLIENT_SECRET=your_client_secret_here
PIPEDREAM_PROJECT_ID=your_project_id_here
PIPEDREAM_PROJECT_ENVIRONMENT=development  # or "production" for production

# Optional: Additional allowed origins for Connect tokens
PIPEDREAM_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Pipedream Workflow API (for Gmail email fetching)
# Get these from your Pipedream workspace settings
PIPEDREAM_API_KEY=your_pipedream_api_key_here
PIPEDREAM_ORG_ID=your_organization_id_here

# Gmail Webhook URL (triggered when Gmail is connected)
PIPEDREAM_GMAIL_WEBHOOK_URL=https://eoo94of3fq3fs7o.m.pipedream.net
```

## Setup Steps

### 1. Create a Pipedream Project

1. Go to [pipedream.com/projects](https://pipedream.com/projects)
2. Create a new project or use an existing one
3. Copy your **Project ID** from the project settings

### 2. Create OAuth Client Credentials

1. Visit the [API settings](https://pipedream.com/settings/api) for your workspace
2. Create a new OAuth client
3. Copy the **Client ID** and **Client Secret**

### 2.5. Get Workflow API Credentials (Optional, for Gmail)

1. Visit the [API settings](https://pipedream.com/settings/api) for your workspace
2. Copy your **API Key** (or create one if you don't have it)
3. Get your **Organization ID** from your workspace settings or project settings
4. Add these to your `.env` file as `PIPEDREAM_API_KEY` and `PIPEDREAM_ORG_ID`

### 3. Configure Environment Variables

1. Add the environment variables listed above to your `.env` file
2. Replace the placeholder values with your actual credentials
3. For production, set `PIPEDREAM_PROJECT_ENVIRONMENT=production`

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/settings/integrations`
3. Click "Connect" on any platform (Gmail, Slack, etc.)
4. Complete the OAuth flow
5. Verify the connection appears in the integrations list

## How It Works

### Backend (Token Generation)

The backend API route (`/api/connect/token`) generates short-lived Connect tokens for authenticated users:

- Verifies user authentication via Better Auth
- Creates a Connect token scoped to the user's ID
- Returns the token to the frontend

### Frontend (Account Connection)

The frontend uses the Pipedream Connect SDK to:

- Request Connect tokens from the backend
- Open an OAuth flow in an iframe
- Handle account connection callbacks
- List and manage connected accounts

### Supported Platforms

The following platforms are currently supported:

- Gmail
- Slack
- WhatsApp Business
- LinkedIn
- Instagram
- GitHub
- Notion
- Google Sheets

## Troubleshooting

### "Client not initialized" Error

- Ensure `PipedreamClientProvider` is wrapping your app layout
- Check that the user is authenticated
- Verify environment variables are set correctly

### "Failed to create Connect token" Error

- Verify `PIPEDREAM_CLIENT_ID` and `PIPEDREAM_CLIENT_SECRET` are correct
- Check that `PIPEDREAM_PROJECT_ID` matches your project
- Ensure the project environment matches your `PIPEDREAM_PROJECT_ENVIRONMENT` setting

### OAuth Flow Not Opening

- Check browser console for errors
- Verify CORS settings in Pipedream project
- Ensure `allowedOrigins` includes your domain

### Accounts Not Appearing

- Check that the `externalUserId` matches the authenticated user's ID
- Verify the account was successfully connected in Pipedream dashboard
- Check browser console for API errors

## Security Notes

- **Never expose** `PIPEDREAM_CLIENT_SECRET` in client-side code
- All token generation happens server-side
- Connect tokens are short-lived and automatically refreshed
- User credentials are stored securely by Pipedream, not in your database

## Additional Resources

- [Pipedream Connect Documentation](https://pipedream.com/docs/connect)
- [Pipedream Connect Quickstart](https://pipedream.com/docs/connect/managed-auth/quickstart)
- [Pipedream API Reference](https://pipedream.com/docs/api)
