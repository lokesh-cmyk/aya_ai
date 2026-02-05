/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth, getSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { PipedreamClient, ProjectEnvironment } from '@pipedream/sdk/server';

const markConnectedSchema = z.object({
  platform: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
});

// Default token expiration times (in seconds) for different platforms
const DEFAULT_TOKEN_EXPIRY: Record<string, number> = {
  gmail: 3600, // Google OAuth tokens expire in 1 hour
  google_gmail: 3600,
  outlook: 3600, // Microsoft OAuth tokens also expire in 1 hour
  slack: 43200, // Slack tokens typically last 12 hours
  // Add more platforms as needed
};

// Mark a platform as connected (for Pipedream Connect flow)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = markConnectedSchema.parse(body);

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, email: true },
    });

    // Use tokens from request body if provided, otherwise fetch from Pipedream
    let accessToken: string | undefined = validated.accessToken;
    let refreshToken: string | undefined = validated.refreshToken;
    let expiresAt: Date | undefined = validated.expiresAt ? new Date(validated.expiresAt) : undefined;
    let accountId: string | undefined;

    // ALWAYS fetch credentials from Pipedream Connect
    console.log(`[mark-connected] Fetching credentials from Pipedream Connect for ${validated.platform}...`);
    
    // Get OAuth App IDs from environment variables
    const GMAIL_OAUTH_APP_ID = process.env.GMAIL_OAUTH_APP_ID || process.env.NEXT_PUBLIC_GMAIL_OAUTH_APP_ID || 'oa_NjiRLX';
    // Slack OAuth App ID (e.g., oa_5Ki9rX)
    const SLACK_OAUTH_APP_ID = process.env.NEXT_PUBLIC_SLACK_OAUTH_APP_ID || process.env.SLACK_OAUTH_APP_ID;
    
    if (validated.platform.toLowerCase() === 'gmail') {
      console.log(`[mark-connected] Using custom OAuth client for Gmail: ${GMAIL_OAUTH_APP_ID}`);
    }
    if (validated.platform.toLowerCase() === 'slack') {
      if (SLACK_OAUTH_APP_ID) {
        console.log(`[mark-connected] Using custom OAuth client for Slack: ${SLACK_OAUTH_APP_ID}`);
      } else {
        console.warn(`[mark-connected] Slack OAuth App ID not found. Please set NEXT_PUBLIC_SLACK_OAUTH_APP_ID in your .env file`);
      }
    }
    
    try {
      const getProjectEnvironment = (): ProjectEnvironment => {
        const env = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development';
        return env === 'production' ? ProjectEnvironment.Production : ProjectEnvironment.Development;
      };

      // According to Pipedream OAuth docs: https://pipedream.com/docs/rest-api/auth#oauth
      // - Uses Client Credentials OAuth flow for server-side API requests
      // - SDK automatically handles token refresh (tokens expire after 1 hour)
      // - All credentials stored securely server-side
      const pd = new PipedreamClient({
        clientId: process.env.PIPEDREAM_CLIENT_ID!,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
        projectEnvironment: getProjectEnvironment(),
        projectId: process.env.PIPEDREAM_PROJECT_ID!,
      });

      // Fetch accounts from Pipedream Connect with credentials
      const accountsResponse = await pd.accounts.list({
        externalUserId: session.user.id,
        includeCredentials: true,
      });

      console.log(`[mark-connected] Pipedream response type:`, typeof accountsResponse);

      let accounts: any[] = [];
      if (Array.isArray(accountsResponse)) {
        accounts = accountsResponse;
      } else if (accountsResponse && typeof accountsResponse === "object") {
        const responseAny = accountsResponse as any;
        if (responseAny.response?.data && Array.isArray(responseAny.response.data)) {
          accounts = responseAny.response.data;
        } else if (Array.isArray(responseAny.data)) {
          accounts = responseAny.data;
        }
      }

      console.log(`[mark-connected] Found ${accounts.length} accounts from Pipedream`);

      // Find the account for this platform
      // According to Pipedream Connect demo: https://pipedream.com/connect/demo
      // Slack uses "nameSlug": "slack_v2" (not "slack")
      const platformAccount = accounts.find((acc: any) => {
        const appSlug = acc.app?.nameSlug || acc.app?.name || acc.app || acc.name || "";
        const appLower = String(appSlug).toLowerCase();
        const platformLower = validated.platform.toLowerCase();
        
        // For Gmail, also check for "google_gmail"
        if (platformLower === 'gmail') {
          return appLower === 'gmail' || appLower === 'google_gmail' || appLower.includes('gmail');
        }
        
        // For Slack, check for both "slack" and "slack_v2"
        if (platformLower === 'slack') {
          return appLower === 'slack' || appLower === 'slack_v2' || appLower.includes('slack');
        }
        
        return (
          appLower === platformLower ||
          appLower.includes(platformLower) ||
          platformLower.includes(appLower)
        );
      });

      if (platformAccount) {
        console.log(`[mark-connected] Found platform account:`, {
          id: platformAccount.id,
          app: platformAccount.app,
          hasCredentials: !!platformAccount.credentials,
        });

        accountId = platformAccount.id;

        // Try to get credentials from the account object
        if (platformAccount.credentials) {
          // Extract credentials with multiple fallbacks
          accessToken =
            platformAccount.credentials.access_token ||
            platformAccount.credentials.oauth_access_token ||
            platformAccount.credentials.accessToken ||
            platformAccount.credentials.token ||
            accessToken;
          
          refreshToken =
            platformAccount.credentials.refresh_token ||
            platformAccount.credentials.oauth_refresh_token ||
            platformAccount.credentials.refreshToken ||
            refreshToken;

          // Parse expiration date with multiple fallbacks
          const expiresAtValue = 
            platformAccount.credentials.expires_at ||
            platformAccount.credentials.expiresAt ||
            platformAccount.credentials.expiry_date;
          
          if (expiresAtValue) {
            expiresAt = new Date(expiresAtValue);
          } else if (platformAccount.credentials.expires_in) {
            // If expires_in is provided (seconds from now), calculate the expiration date
            const expiresInSeconds = parseInt(platformAccount.credentials.expires_in);
            expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
          }

          console.log(`[mark-connected] Extracted credentials from list:`, {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasExpiresAt: !!expiresAt,
            expiresAt: expiresAt?.toISOString(),
          });
        } else {
          // Credentials not in list response, try REST API endpoint directly
          console.log(`[mark-connected] Credentials not in list, trying REST API endpoint for account ${accountId}...`);
          try {
            const projectId = process.env.PIPEDREAM_PROJECT_ID!;
            const environment = getProjectEnvironment() === ProjectEnvironment.Production ? 'production' : 'development';
            
            // Get OAuth token for API authentication
            const oauthResponse = await fetch('https://api.pipedream.com/v1/oauth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.PIPEDREAM_CLIENT_ID!,
                client_secret: process.env.PIPEDREAM_CLIENT_SECRET!,
              }),
            });

            if (oauthResponse.ok) {
              const oauthData = await oauthResponse.json();
              const oauthToken = oauthData.access_token;

              const restResponse = await fetch(
                `https://api.pipedream.com/v1/connect/${projectId}/accounts/${accountId}?include_credentials=true`,
                {
                  headers: {
                    'Authorization': `Bearer ${oauthToken}`,
                    'x-pd-environment': environment,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (restResponse.ok) {
                const accountData = await restResponse.json();
                console.log(`[mark-connected] REST API response:`, {
                  hasCredentials: !!accountData.credentials,
                  accountId: accountData.id,
                });

                if (accountData.credentials) {
                  accessToken =
                    accountData.credentials.access_token ||
                    accountData.credentials.oauth_access_token ||
                    accountData.credentials.accessToken ||
                    accountData.credentials.token ||
                    accessToken;
                  
                  refreshToken =
                    accountData.credentials.refresh_token ||
                    accountData.credentials.oauth_refresh_token ||
                    accountData.credentials.refreshToken ||
                    refreshToken;

                  const expiresAtValue = 
                    accountData.expires_at ||
                    accountData.credentials.expires_at ||
                    accountData.credentials.expiresAt ||
                    accountData.credentials.expiry_date;
                  
                  if (expiresAtValue) {
                    expiresAt = new Date(expiresAtValue);
                  } else if (accountData.credentials.expires_in) {
                    const expiresInSeconds = parseInt(accountData.credentials.expires_in);
                    expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
                  }

                  console.log(`[mark-connected] Extracted credentials from REST API:`, {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    hasExpiresAt: !!expiresAt,
                  });
                } else {
                  console.warn(`[mark-connected] REST API returned account but no credentials. Account may not be using custom OAuth client.`);
                }
              } else {
                const errorText = await restResponse.text();
                console.warn(`[mark-connected] REST API call failed: ${restResponse.status} ${restResponse.statusText}`, errorText);
              }
            }
          } catch (restError: any) {
            console.warn(`[mark-connected] REST API fallback failed:`, restError.message);
          }
        }
      } else {
        console.warn(`[mark-connected] No platform account found for ${validated.platform}`);
      }
    } catch (error: any) {
      console.error(`[mark-connected] Failed to fetch from Pipedream:`, error.message);
    }

    // CRITICAL FIX: If no expiration date was provided, set a default based on the platform
    if (!expiresAt && accessToken) {
      const platformKey = validated.platform.toLowerCase();
      const defaultExpirySeconds = DEFAULT_TOKEN_EXPIRY[platformKey] || 3600; // Default to 1 hour
      expiresAt = new Date(Date.now() + defaultExpirySeconds * 1000);
      console.log(`[mark-connected] No expiration date provided, setting default: ${expiresAt.toISOString()} (${defaultExpirySeconds}s from now)`);
    }

    // If no access token, still save the connection but mark it as needing credentials
    if (!accessToken) {
      console.warn(`[mark-connected] No access token available for ${validated.platform}, but saving connection anyway`);
      console.warn(`[mark-connected] Credentials will be fetched when needed (e.g., when fetching emails)`);
    }

    console.log(`[mark-connected] Saving integration with tokens:`, {
      platform: validated.platform,
      userId: session.user.id,
      teamId: user?.teamId,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasExpiresAt: !!expiresAt,
      expiresAt: expiresAt?.toISOString(),
    });

    // Find existing integration
    const existing = await prisma.integration.findFirst({
      where: {
        name: validated.platform,
        type: 'pipedream',
        userId: session.user.id,
        ...(user?.teamId && { teamId: user.teamId }),
      },
    });

    // Create or update integration with dedicated token fields
    const integration = existing
      ? await prisma.integration.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            userId: session.user.id,
            teamId: user?.teamId || null,
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            tokenExpiresAt: expiresAt ?? null, // Convert undefined to null
            accountId: accountId || null,
            config: {
              ...(existing.config as any || {}),
              connectedVia: 'pipedream_connect',
              connectedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          },
        })
      : await prisma.integration.create({
          data: {
            name: validated.platform,
            type: 'pipedream',
            isActive: true,
            userId: session.user.id,
            teamId: user?.teamId || null,
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            tokenExpiresAt: expiresAt ?? null, // Convert undefined to null
            accountId: accountId || null,
            config: {
              connectedVia: 'pipedream_connect',
              connectedAt: new Date().toISOString(),
            },
          },
        });

    console.log(`[mark-connected] Integration ${existing ? 'updated' : 'created'}: ${integration.id}`);
    
    // Verify the token was saved
    const verification = await prisma.integration.findUnique({
      where: { id: integration.id },
      select: {
        id: true,
        userId: true,
        teamId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        accountId: true,
      },
    });
    
    console.log(`[mark-connected] Verification - Integration saved with:`, {
      id: verification?.id,
      userId: verification?.userId,
      teamId: verification?.teamId,
      hasAccessToken: !!verification?.accessToken,
      accessTokenLength: verification?.accessToken?.length,
      hasRefreshToken: !!verification?.refreshToken,
      tokenExpiresAt: verification?.tokenExpiresAt?.toISOString(),
      accountId: verification?.accountId,
    });

    // Trigger sync for email platforms via Inngest
    const emailPlatforms = ['gmail', 'outlook'];
    if (emailPlatforms.includes(validated.platform.toLowerCase())) {
      try {
        const { inngest } = await import('@/lib/inngest/client');

        const eventName = validated.platform.toLowerCase() === 'gmail' 
          ? 'email/gmail.sync' 
          : 'email/outlook.sync';

        await inngest.send({
          name: eventName,
          data: {
            userId: session.user.id,
            userEmail: user?.email || '',
            teamId: user?.teamId || '',
          },
        });
        
        console.log(`[mark-connected] Triggered sync for ${validated.platform}`);
      } catch (error: any) {
        console.error(`[mark-connected] Error triggering sync:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: integration.id,
        platform: validated.platform,
        status: 'connected',
        connectedAt: integration.createdAt,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenExpiresAt: expiresAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[mark-connected] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to mark as connected' },
      { status: 500 }
    );
  }
}