// hooks/useIntegrations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFrontendClient } from "@pipedream/connect-react";
import { useSession } from "@/lib/auth-client";
import { useState, useMemo } from "react";

// Using Pipedream Connect with the newer Slack app
// - App ID: app_M0hv7G
// - Name: "Slack" (not legacy)
// - Name slug: "slack_v2" (as shown in Pipedream Connect demo)
// - OAuth App "oa_5Ki9rX" (AYA AI SLACK) should work with slack_v2
const platformToAppId: Record<string, string> = {
  'gmail': 'gmail',
  'outlook': 'outlook',
  'slack': 'slack_v2', // Use 'slack_v2' for Pipedream Connect (app_M0hv7G)
  'whatsapp': 'whatsapp_business',
  'linkedin': 'linkedin',
  'instagram': 'instagram',
  'github': 'github',
  'notion': 'notion',
  'google_sheets': 'google_sheets',
};

const appIdToPlatform: Record<string, string> = {
  'gmail': 'gmail',
  'gmail_v2': 'gmail',
  'outlook': 'outlook',
  'slack': 'slack',
  'slack_v2': 'slack',
  'whatsapp_business': 'whatsapp',
  'linkedin': 'linkedin',
  'instagram': 'instagram',
  'github': 'github',
  'notion': 'notion',
  'google_sheets': 'google_sheets',
};

export function useIntegrations() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const frontendClient = useFrontendClient();
  const [connecting, setConnecting] = useState<string | null>(null);

  // Fetch database connections
  const { data: dbConnections, isLoading } = useQuery({
    queryKey: ['db-integrations', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const res = await fetch('/api/integrations');
      if (!res.ok) return [];
      const data = await res.json();
      return data.connections || [];
    },
    enabled: !!session?.user?.id,
    refetchInterval: 30000,
  });

  // Build connected platforms map
  const connectedPlatformsMap = useMemo(() => {
    const map = new Map<string, any>();
    
    if (dbConnections && dbConnections.length > 0) {
      dbConnections.forEach((conn: any) => {
        const platform = conn.platform || conn.name;
        if (platform) {
          const platformId = platform.toLowerCase().trim();
          map.set(platformId, { 
            id: conn.id,
            app: platformToAppId[platform] || platform,
            platform: platform,
            created_at: conn.connectedAt || conn.createdAt || conn.lastSyncAt,
            source: 'database',
            status: conn.status || 'connected',
            ...conn,
          });
        }
      });
    }
    
    return map;
  }, [dbConnections]);

  // Get connected account helper
  const getConnectedAccount = (platformId: string) => {
    const normalizedPlatformId = platformId.toLowerCase().trim();
    let account = connectedPlatformsMap.get(normalizedPlatformId);
    
    if (!account) {
      for (const [key, value] of connectedPlatformsMap.entries()) {
        const platform = (value.platform || value.name || '').toLowerCase();
        if (platform === normalizedPlatformId || key === normalizedPlatformId) {
          account = value;
          break;
        }
      }
    }
    
    return account || null;
  };

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (platform: string) => {
      if (!frontendClient) {
        throw new Error('Frontend client not initialized');
      }
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      // Get app ID from mapping
      // Using Pipedream Connect with slack_v2 (app_M0hv7G - "Slack", not legacy)
      let appId = platformToAppId[platform] || platform;

      const GMAIL_OAUTH_APP_ID = process.env.NEXT_PUBLIC_GMAIL_OAUTH_APP_ID || 'oa_NjiRLX';
      const SLACK_OAUTH_APP_ID = process.env.NEXT_PUBLIC_SLACK_OAUTH_APP_ID;

      // Enhanced debugging for Slack
      // Using Pipedream Connect with slack_v2
      // - App ID: app_M0hv7G
      // - Name: "Slack" (not legacy)
      // - Name slug: "slack_v2"
      if (platform.toLowerCase() === 'slack') {
        console.log('=== SLACK CONNECTION DEBUG (Pipedream Connect) ===');
        console.log('Platform:', platform);
        console.log('App ID (name slug):', appId, '(should be "slack_v2" for app_M0hv7G)');
        console.log('SLACK_OAUTH_APP_ID:', SLACK_OAUTH_APP_ID, '(OAuth App: "AYA AI SLACK")');
        console.log('Pipedream Project ID:', process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID);
        console.log('Pipedream Project Environment:', process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT);
        console.log('User ID:', session?.user?.id);
        console.log('=============================');
      }

      return new Promise<void>((resolve, reject) => {
        // Using Pipedream Connect with slack_v2
        // - App ID: app_M0hv7G, Name: "Slack", Name slug: "slack_v2"
        // According to Pipedream API: app can be either app ID (e.g., app_M0hv7G) or name slug (e.g., 'slack_v2')
        // We use the name slug which is simpler and more maintainable
        const connectOptions: any = { 
          app: appId as any, // For Slack, this will be 'slack_v2' (Pipedream Connect)
        };

        if (platform.toLowerCase() === 'gmail') {
          connectOptions.oauthAppId = GMAIL_OAUTH_APP_ID;
          console.log('Using Gmail OAuth App:', GMAIL_OAUTH_APP_ID);
        }
        if (platform.toLowerCase() === 'slack') {
          if (!SLACK_OAUTH_APP_ID) {
            reject(new Error('Slack OAuth App ID not configured. Set NEXT_PUBLIC_SLACK_OAUTH_APP_ID in .env'));
            return;
          }
          connectOptions.oauthAppId = SLACK_OAUTH_APP_ID;
          console.log('🔗 Connecting Slack via Pipedream Connect:');
          console.log('   App (name slug):', appId, '(slack_v2 for app_M0hv7G - "Slack")');
          console.log('   OAuth App ID:', SLACK_OAUTH_APP_ID);
          console.log('   OAuth Client Name: "AYA AI SLACK"');
          console.log('📦 Full connect options:', JSON.stringify(connectOptions, null, 2));
        }

        frontendClient.connectAccount({
          ...connectOptions,
          onSuccess: async (account) => {
            console.log('✅ Platform connected successfully!');
            console.log('📦 Account response:', JSON.stringify(account, null, 2));
            setConnecting(null);
            
            // Save to database
            // Note: The account object from connectAccount may not include credentials directly
            // The /api/integrations/mark-connected endpoint will fetch credentials from Pipedream
            try {
              const accountAny = account as any;
              
              // Try to extract credentials if they exist in the response
              // But don't rely on them - mark-connected will fetch them from Pipedream
              const accountCredentials = accountAny?.credentials || accountAny?.data?.credentials || {};
              const tokens = {
                accessToken: accountCredentials.access_token || accountCredentials.accessToken,
                refreshToken: accountCredentials.refresh_token || accountCredentials.refreshToken,
                expiresAt: accountCredentials.expires_at || accountCredentials.expiresAt,
              };

              console.log('💾 Saving connection to database...');
              const saveResponse = await fetch('/api/integrations/mark-connected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  platform,
                  // Only include tokens if they exist, otherwise mark-connected will fetch them
                  ...(tokens.accessToken && { 
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: tokens.expiresAt,
                  }),
                }),
              });

              if (saveResponse.ok) {
                const saveData = await saveResponse.json();
                console.log('✅ Connection saved successfully:', saveData);
                
                // For Slack, trigger channel selection
                if (platform.toLowerCase() === 'slack' && saveData.connection?.id) {
                  // Dispatch custom event to trigger channel selection dialog
                  window.dispatchEvent(new CustomEvent('slack-connected', {
                    detail: { integrationId: saveData.connection.id }
                  }));
                }
                
                // Auto-sync email platforms
                const emailPlatforms = ['gmail', 'outlook'];
                if (emailPlatforms.includes(platform.toLowerCase())) {
                  fetch(`/api/integrations/${platform}/sync`, { method: 'POST' }).catch(() => {});
                }
              } else {
                const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Failed to save connection:', errorData);
              }
            } catch (err) {
              console.error('❌ Error saving connection:', err);
            }

            // Invalidate and refetch connections
            queryClient.invalidateQueries({ queryKey: ['db-integrations'] });
            setTimeout(() => {
              queryClient.refetchQueries({ queryKey: ['db-integrations'] });
            }, 500);
            
            resolve();
          },
          onError: (error: any) => {
            // Enhanced error logging
            console.error('❌ Connection error (full):', error);
            console.error('❌ Connection error type:', typeof error);
            console.error('❌ Connection error keys:', Object.keys(error || {}));
            
            // Try to extract more details
            const errAny = error as any;
            const errorDetails = {
              platform,
              name: errAny?.name,
              message: errAny?.message,
              code: errAny?.code,
              status: errAny?.status,
              statusText: errAny?.statusText,
              details: errAny?.details,
              response: errAny?.response,
              data: errAny?.data,
              error: errAny?.error,
              innerError: errAny?.innerError,
              toString: errAny?.toString?.(),
              stack: errAny?.stack,
            };
            console.error('❌ Connection error details:', errorDetails);

            setConnecting(null);

            // Check for specific error types
            if (error?.code === 'invalid_oauth_app' || errAny?.code === 'invalid_oauth_app') {
              const errorMsg = `OAuth App configuration error for "${platform}". Please verify in Pipedream Dashboard:
1. OAuth App ID (${platform === 'slack' ? SLACK_OAUTH_APP_ID : GMAIL_OAUTH_APP_ID}) matches "AYA AI SLACK" client
2. OAuth App is linked to the correct platform (${platform})
3. Required scopes are configured
4. Redirect URI matches Slack app settings`;
              console.error('🔴', errorMsg);
              reject(new Error(errorMsg));
            } else if (error?.message?.includes('redirect_uri') || errAny?.message?.includes('redirect_uri')) {
              const errorMsg = 'Redirect URI mismatch. Verify redirect URI in:\n' +
                    '1. Pipedream OAuth App settings\n' +
                    '2. Slack app OAuth & Permissions → Redirect URLs';
              console.error('🔴', errorMsg);
              reject(new Error(errorMsg));
            } else {
              // Try to extract a meaningful error message
              let errorMessage = errAny?.message || 
                                errAny?.error || 
                                errAny?.data?.error ||
                                errAny?.data?.message ||
                                errAny?.response?.data?.error ||
                                errAny?.response?.data?.message ||
                                'Connection failed. Check console for details.';
              
              // If error message is empty or generic, provide helpful context
              if (!errorMessage || errorMessage === '{}' || errorMessage === '[object Object]') {
                errorMessage = `Failed to connect ${platform}. Please verify:
1. OAuth App ID (${platform === 'slack' ? SLACK_OAUTH_APP_ID : GMAIL_OAUTH_APP_ID}) is correct
2. OAuth App "AYA AI SLACK" is properly configured in Pipedream
3. Redirect URI matches in both Pipedream and Slack app
4. Required scopes are enabled`;
              }
              
              console.error('🔴 Final error message:', errorMessage);
              reject(new Error(errorMessage));
            }
          },
          onClose: (status: any) => {
            console.log('Dialog closed:', status);
            setConnecting(null);
            if (!status.successful && status.status !== 'cancelled') {
              reject(new Error('Connection failed'));
            }
          },
        });
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await fetch(`/api/integrations?id=${accountId}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['db-integrations'] });
    },
  });

  return {
    isLoading,
    connecting,
    setConnecting,
    connectedPlatformsMap,
    getConnectedAccount,
    connectMutation,
    disconnectMutation,
    queryClient,
  };
}