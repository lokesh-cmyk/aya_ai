# Pipedream Connect Debugging Guide

## Current Issue: "Connection failed try again!!"

This document helps debug Pipedream Connect integration issues.

## Enhanced Error Logging

The codebase now includes comprehensive error logging. When you see "Connection failed", check:

### 1. Browser Console
Look for these log messages:
- `Connection error (full):` - Full error object
- `Connection error message:` - Error message
- `Token callback error:` - Token fetch errors
- `Fetching Connect token for externalUserId:` - Token generation attempts

### 2. Server Console (Terminal)
Look for these log messages:
- `Creating Connect token for externalUserId:` - Token creation attempts
- `Connect token created successfully` - Successful token generation
- `Create Connect token error (full):` - Token creation errors
- `Pipedream environment variables validated` - Environment check

## Common Issues & Solutions

### Issue 1: Missing Environment Variables

**Symptoms:**
- Error: "Missing required Pipedream environment variables"
- Connection fails immediately

**Solution:**
Ensure these environment variables are set in your `.env` file:

```env
# Required for backend (server-side)
PIPEDREAM_CLIENT_ID=your_client_id
PIPEDREAM_CLIENT_SECRET=your_client_secret
PIPEDREAM_PROJECT_ID=your_project_id
PIPEDREAM_PROJECT_ENVIRONMENT=development  # or "production"

# Required for frontend (client-side)
NEXT_PUBLIC_PIPEDREAM_PROJECT_ID=your_project_id
NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT=development  # or "production"
```

**Note:** The `projectEnvironment` must match between frontend and backend!

### Issue 2: Token Generation Fails

**Symptoms:**
- Error: "Failed to create Connect token"
- Token callback errors in console

**Check:**
1. Verify `PIPEDREAM_CLIENT_ID`, `PIPEDREAM_CLIENT_SECRET`, and `PIPEDREAM_PROJECT_ID` are correct
2. Verify `PIPEDREAM_PROJECT_ENVIRONMENT` matches your Pipedream project environment
3. Check server console for detailed error messages

### Issue 3: Invalid App ID

**Symptoms:**
- 404 errors for `validate?app_id=...`
- "App not found" errors

**Solution:**
- Use exact app slugs from Pipedream's registry (e.g., `"gmail"` not `"gmail_v2"`)
- Check the `platformToAppId` mapping in `app/(app)/settings/integrations/page.tsx`

### Issue 4: Environment Mismatch

**Symptoms:**
- Tokens work but connections fail
- "Session expired" errors

**Solution:**
Ensure `PIPEDREAM_PROJECT_ENVIRONMENT` (backend) matches `NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT` (frontend):
- Both should be `"development"` OR both should be `"production"`
- They must match exactly!

### Issue 5: Allowed Origins

**Symptoms:**
- Token created but connection fails
- CORS-like errors

**Solution:**
The `allowedOrigins` in token creation must include your app's origin:
- For localhost: `http://localhost:3000` should be in the list
- Check server logs for "Allowed origins:" to see what's being sent

## Debugging Steps

### Step 1: Check Environment Variables

Run this in your terminal to verify environment variables are loaded:

```bash
# Check if variables are set (won't show values for security)
node -e "console.log('PIPEDREAM_PROJECT_ID:', process.env.PIPEDREAM_PROJECT_ID ? 'SET' : 'MISSING')"
```

### Step 2: Test Token Generation

1. Open browser DevTools → Network tab
2. Try to connect a platform
3. Look for `/api/connect/token` request
4. Check:
   - Status code (should be 200)
   - Response body (should contain `token` field)
   - Error messages in console

### Step 3: Check Pipedream Project Settings

1. Go to your Pipedream project settings
2. Verify:
   - Project ID matches `PIPEDREAM_PROJECT_ID`
   - Environment matches `PIPEDREAM_PROJECT_ENVIRONMENT`
   - OAuth client credentials are correct

### Step 4: Review Error Logs

When connection fails, check both:

**Browser Console:**
```javascript
// Look for these:
- "Connection error (full):"
- "Token callback error:"
- "Connection mutation error:"
```

**Server Console (Terminal):**
```javascript
// Look for these:
- "Creating Connect token for externalUserId:"
- "Create Connect token error (full):"
- "Pipedream environment variables validated"
```

## Expected Flow

1. **User clicks "Connect"** → `handleConnect()` called
2. **Frontend calls `connectAccount()`** → Pipedream SDK opens OAuth dialog
3. **SDK needs token** → Calls `tokenCallback()`
4. **Token callback** → Fetches `/api/connect/token`
5. **Backend generates token** → Uses Pipedream SDK `tokens.create()`
6. **Token returned** → Frontend uses token for OAuth flow
7. **User authorizes** → `onSuccess()` called
8. **Connection saved** → Database updated

## Quick Fixes

### If you see "Connection failed try again!!":

1. **Open browser console** (F12)
2. **Look for error messages** starting with "Connection error" or "Token callback error"
3. **Copy the full error message**
4. **Check server terminal** for corresponding error logs
5. **Verify environment variables** are set correctly
6. **Ensure environment matches** between frontend and backend

### If token generation fails:

1. Check server console for "Create Connect token error"
2. Verify `PIPEDREAM_CLIENT_ID`, `PIPEDREAM_CLIENT_SECRET`, `PIPEDREAM_PROJECT_ID` are correct
3. Verify `PIPEDREAM_PROJECT_ENVIRONMENT` matches your Pipedream project

### If OAuth dialog doesn't open:

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_PIPEDREAM_PROJECT_ID` is set
3. Verify `NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT` matches backend
4. Check if popup blockers are enabled

## Still Having Issues?

If you're still seeing errors after checking the above:

1. **Share the full error message** from browser console
2. **Share the server console logs** when the error occurs
3. **Verify your Pipedream project settings** match your environment variables
4. **Check Pipedream documentation**: https://pipedream.com/docs/connect

## Environment Variable Reference

### Backend (Server-side)
- `PIPEDREAM_CLIENT_ID` - Your Pipedream OAuth client ID
- `PIPEDREAM_CLIENT_SECRET` - Your Pipedream OAuth client secret
- `PIPEDREAM_PROJECT_ID` - Your Pipedream project ID
- `PIPEDREAM_PROJECT_ENVIRONMENT` - `"development"` or `"production"`

### Frontend (Client-side)
- `NEXT_PUBLIC_PIPEDREAM_PROJECT_ID` - Same as backend project ID
- `NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT` - Must match backend environment

**Critical:** Frontend and backend environments MUST match!
