/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { prisma } from "@/lib/prisma";
import { pipedream } from "@/lib/integrations/pipedream";
import { PipedreamClient, ProjectEnvironment } from "@pipedream/sdk/server";

/**
 * Gmail MCP Client wrapper
 * Handles OAuth token management and MCP connection via Smithery
 */
export class GmailMCPClient {
  private client: Client | null = null;
  private userId: string;
  private teamId: string | null;

  constructor(userId: string, teamId: string | null = null) {
    this.userId = userId;
    this.teamId = teamId;
  }

  /**
   * Get OAuth access token for Gmail
   * Checks database first, then fetches from Pipedream if needed
   */
  private async getAccessToken(): Promise<string> {
    console.log(`[GmailMCPClient] Fetching Gmail integration for user ${this.userId}, team ${this.teamId || 'none'}`);

    // Get Gmail integration from database - try multiple strategies
    // Strategy 1: Find by userId (most specific)
    let integration = await prisma.integration.findFirst({
      where: {
        name: "gmail",
        type: "pipedream",
        isActive: true,
        userId: this.userId,
      },
    });

    console.log(`[GmailMCPClient] Strategy 1 (userId): ${integration ? 'Found' : 'Not found'}`);

    // Strategy 2: If not found and we have a teamId, try with teamId
    if (!integration && this.teamId) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          teamId: this.teamId,
        },
      });
      console.log(`[GmailMCPClient] Strategy 2 (teamId): ${integration ? 'Found' : 'Not found'}`);
    }

    // Strategy 3: Check config for backwards compatibility
    if (!integration) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          OR: [
            { config: { path: ["userId"], equals: this.userId } },
            ...(this.teamId ? [{ config: { path: ["teamId"], equals: this.teamId } }] : []),
          ],
        },
      });
      console.log(`[GmailMCPClient] Strategy 3 (config): ${integration ? 'Found' : 'Not found'}`);
    }

    // Strategy 4: Last resort - find any active Gmail integration (for debugging)
    if (!integration) {
      const allGmailIntegrations = await prisma.integration.findMany({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          teamId: true,
          config: true,
        },
      });
      console.log(`[GmailMCPClient] Strategy 4: Found ${allGmailIntegrations.length} total Gmail integrations:`, 
        allGmailIntegrations.map(i => ({
          id: i.id,
          userId: i.userId,
          teamId: i.teamId,
          configUserId: (i.config as any)?.userId,
          configTeamId: (i.config as any)?.teamId,
        }))
      );
    }

    if (!integration) {
      console.error(`[GmailMCPClient] No Gmail integration found for user ${this.userId}, team ${this.teamId || 'none'}`);
      throw new Error("Gmail integration not found. Please connect your Gmail account first.");
    }

    console.log(`[GmailMCPClient] Integration found: ${integration.id}`);
    console.log(`[GmailMCPClient] Integration details:`, {
      userId: integration.userId,
      teamId: integration.teamId,
      hasAccessToken: !!integration.accessToken,
      hasRefreshToken: !!integration.refreshToken,
      tokenExpiresAt: integration.tokenExpiresAt,
      accountId: integration.accountId,
    });

    // Check if we have a valid access token in database
    let accessToken = integration.accessToken;
    
    // Also check config for backwards compatibility
    if (!accessToken) {
      const config = integration.config as any;
      accessToken = 
        config.accessToken || 
        config.access_token ||
        config.auth?.access_token ||
        config.oauth?.access_token;
    }

    // If we have a token, check if it's expired
    if (accessToken) {
      // Check if token is expired
      if (integration.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(integration.tokenExpiresAt);
        
        // If token expires in less than 5 minutes, refresh it
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          console.log(`[GmailMCPClient] Access token expiring soon, refreshing...`);
          
          const refreshToken = integration.refreshToken || (integration.config as any)?.refreshToken;
          if (refreshToken) {
            try {
              const refreshed = await pipedream.refreshToken(integration.id);
              console.log(`[GmailMCPClient] Token refreshed successfully`);
              
              // Update database with new token
              await prisma.integration.update({
                where: { id: integration.id },
                data: {
                  accessToken: refreshed.accessToken,
                  tokenExpiresAt: refreshed.expiresAt || null,
                },
              });
              
              return refreshed.accessToken;
            } catch (refreshError: any) {
              console.error(`[GmailMCPClient] Token refresh failed:`, refreshError);
              // Fall through to try fetching from Pipedream
            }
          }
        } else {
          console.log(`[GmailMCPClient] Using existing access token from database`);
          return accessToken;
        }
      } else {
        console.log(`[GmailMCPClient] Using existing access token from database`);
        return accessToken;
      }
    }

    // If no access token in database, fetch from Pipedream Connect
    console.log(`[GmailMCPClient] No access token in database, fetching from Pipedream Connect...`);
    console.log(`[GmailMCPClient] Pipedream config check:`, {
      hasClientId: !!process.env.PIPEDREAM_CLIENT_ID,
      hasClientSecret: !!process.env.PIPEDREAM_CLIENT_SECRET,
      hasProjectId: !!process.env.PIPEDREAM_PROJECT_ID,
      projectEnvironment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development',
      accountId: integration.accountId,
    });
    
    // First, try to get credentials using the REST API endpoint with accountId
    // According to Pipedream docs: https://pipedream.com/docs/connect/api-reference/retrieve-account
    // This only works if the account uses a custom OAuth client
    if (integration.accountId) {
      try {
        const getProjectEnvironment = (): ProjectEnvironment => {
          const env = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development';
          return env === 'production' ? ProjectEnvironment.Production : ProjectEnvironment.Development;
        };

        const pd = new PipedreamClient({
          clientId: process.env.PIPEDREAM_CLIENT_ID!,
          clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
          projectEnvironment: getProjectEnvironment(),
          projectId: process.env.PIPEDREAM_PROJECT_ID!,
        });

        console.log(`[GmailMCPClient] Attempting to retrieve account ${integration.accountId} with credentials via REST API...`);
        
        // Use the SDK's account retrieval method if available, or use REST API directly
        try {
          // Try using the SDK method to get a specific account
          const accountResponse = await (pd.accounts as any).get?.({
            accountId: integration.accountId,
            includeCredentials: true,
          });

          if (accountResponse?.credentials) {
            const fetchedToken =
              accountResponse.credentials.access_token ||
              accountResponse.credentials.oauth_access_token ||
              accountResponse.credentials.accessToken ||
              accountResponse.credentials.token;

            if (fetchedToken) {
              console.log(`[GmailMCPClient] Token retrieved via account.get() method`);
              
              const fetchedRefreshToken =
                accountResponse.credentials.refresh_token ||
                accountResponse.credentials.oauth_refresh_token ||
                accountResponse.credentials.refreshToken;

              const fetchedExpiresAt = accountResponse.credentials.expires_at
                ? new Date(accountResponse.credentials.expires_at)
                : accountResponse.credentials.expiresAt
                ? new Date(accountResponse.credentials.expiresAt)
                : null;

              await prisma.integration.update({
                where: { id: integration.id },
                data: {
                  accessToken: fetchedToken,
                  refreshToken: fetchedRefreshToken || null,
                  tokenExpiresAt: fetchedExpiresAt,
                },
              });

              console.log(`[GmailMCPClient] Token saved to database via account.get()`);
              return fetchedToken;
            }
          }
        } catch (getError: any) {
          console.warn(`[GmailMCPClient] account.get() method not available or failed:`, getError.message);
        }

        // Fallback: Use REST API directly
        console.log(`[GmailMCPClient] Trying REST API endpoint directly...`);
        const projectId = process.env.PIPEDREAM_PROJECT_ID!;
        const environment = getProjectEnvironment() === ProjectEnvironment.Production ? 'production' : 'development';
        
        // Get OAuth token for API authentication
        const oauthToken = await this.getPipedreamOAuthToken();
        
        const restResponse = await fetch(
          `https://api.pipedream.com/v1/connect/${projectId}/accounts/${integration.accountId}?include_credentials=true`,
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
          console.log(`[GmailMCPClient] REST API response:`, {
            hasCredentials: !!accountData.credentials,
            accountId: accountData.id,
          });

          if (accountData.credentials) {
            const fetchedToken =
              accountData.credentials.access_token ||
              accountData.credentials.oauth_access_token ||
              accountData.credentials.accessToken ||
              accountData.credentials.token;

            if (fetchedToken) {
              console.log(`[GmailMCPClient] Token retrieved via REST API`);
              
              const fetchedRefreshToken =
                accountData.credentials.refresh_token ||
                accountData.credentials.oauth_refresh_token ||
                accountData.credentials.refreshToken;

              const fetchedExpiresAt = accountData.expires_at
                ? new Date(accountData.expires_at)
                : accountData.credentials.expires_at
                ? new Date(accountData.credentials.expires_at)
                : null;

              await prisma.integration.update({
                where: { id: integration.id },
                data: {
                  accessToken: fetchedToken,
                  refreshToken: fetchedRefreshToken || null,
                  tokenExpiresAt: fetchedExpiresAt,
                },
              });

              console.log(`[GmailMCPClient] Token saved to database via REST API`);
              return fetchedToken;
            }
          } else {
            console.warn(`[GmailMCPClient] REST API returned account but no credentials. This may mean the account is using Pipedream's managed OAuth, not a custom OAuth client.`);
          }
        } else {
          const errorText = await restResponse.text();
          console.warn(`[GmailMCPClient] REST API call failed: ${restResponse.status} ${restResponse.statusText}`, errorText);
        }
      } catch (restError: any) {
        console.warn(`[GmailMCPClient] REST API fallback failed:`, restError.message);
      }
    }
    
    // Fallback: Try accounts.list() method
    try {
      const getProjectEnvironment = (): ProjectEnvironment => {
        const env = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development';
        return env === 'production' ? ProjectEnvironment.Production : ProjectEnvironment.Development;
      };

      const pd = new PipedreamClient({
        clientId: process.env.PIPEDREAM_CLIENT_ID!,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
        projectEnvironment: getProjectEnvironment(),
        projectId: process.env.PIPEDREAM_PROJECT_ID!,
      });

      console.log(`[GmailMCPClient] Calling Pipedream accounts.list with externalUserId: ${this.userId}`);
      const accountsResponse = await pd.accounts.list({
        externalUserId: this.userId,
        includeCredentials: true,
      });

      console.log(`[GmailMCPClient] Pipedream response type:`, typeof accountsResponse);
      console.log(`[GmailMCPClient] Pipedream response keys:`, Object.keys(accountsResponse || {}));

      let accounts: any[] = [];
      if (Array.isArray(accountsResponse)) {
        accounts = accountsResponse;
        console.log(`[GmailMCPClient] Response is array with ${accounts.length} accounts`);
      } else if (accountsResponse && typeof accountsResponse === "object") {
        const responseAny = accountsResponse as any;
        if (responseAny.response?.data && Array.isArray(responseAny.response.data)) {
          accounts = responseAny.response.data;
          console.log(`[GmailMCPClient] Found accounts in response.data: ${accounts.length}`);
        } else if (Array.isArray(responseAny.data)) {
          accounts = responseAny.data;
          console.log(`[GmailMCPClient] Found accounts in data: ${accounts.length}`);
        } else {
          console.log(`[GmailMCPClient] Response structure:`, JSON.stringify(Object.keys(responseAny), null, 2));
        }
      }

      console.log(`[GmailMCPClient] Total accounts found: ${accounts.length}`);
      if (accounts.length > 0) {
        console.log(`[GmailMCPClient] Account apps:`, accounts.map((acc: any) => ({
          id: acc.id,
          appSlug: acc.app?.nameSlug || acc.app?.name,
          hasCredentials: !!acc.credentials,
        })));
      }

      const gmailAccount = accounts.find((acc: any) => {
        const appSlug = acc.app?.nameSlug || acc.app?.name || acc.app || acc.name || "";
        const appLower = String(appSlug).toLowerCase();
        return (
          appLower === "gmail" ||
          appLower.includes("gmail") ||
          appLower === "google_gmail"
        );
      });

      if (gmailAccount) {
        console.log(`[GmailMCPClient] Gmail account found:`, {
          id: gmailAccount.id,
          appSlug: gmailAccount.app?.nameSlug,
          hasCredentials: !!gmailAccount.credentials,
          credentialsKeys: gmailAccount.credentials ? Object.keys(gmailAccount.credentials) : [],
        });

        if (gmailAccount.credentials) {
          const fetchedToken =
            gmailAccount.credentials.access_token ||
            gmailAccount.credentials.oauth_access_token ||
            gmailAccount.credentials.accessToken ||
            gmailAccount.credentials.token;

          console.log(`[GmailMCPClient] Extracted token:`, {
            hasAccessToken: !!fetchedToken,
            tokenLength: fetchedToken?.length,
            tokenPreview: fetchedToken ? `${fetchedToken.substring(0, 20)}...` : 'none',
          });

          if (fetchedToken) {
            console.log(`[GmailMCPClient] Token fetched from Pipedream Connect successfully`);
            
            // Update the database with the fetched token
            const fetchedRefreshToken =
              gmailAccount.credentials.refresh_token ||
              gmailAccount.credentials.oauth_refresh_token ||
              gmailAccount.credentials.refreshToken;

            const fetchedExpiresAt = gmailAccount.credentials.expires_at
              ? new Date(gmailAccount.credentials.expires_at)
              : gmailAccount.credentials.expiresAt
              ? new Date(gmailAccount.credentials.expiresAt)
              : null;

            console.log(`[GmailMCPClient] Updating database with token for integration ${integration.id}`);
            const updated = await prisma.integration.update({
              where: { id: integration.id },
              data: {
                accessToken: fetchedToken,
                refreshToken: fetchedRefreshToken || null,
                tokenExpiresAt: fetchedExpiresAt,
                accountId: gmailAccount.id || null,
              },
            });

            console.log(`[GmailMCPClient] Token saved to database successfully`);
            console.log(`[GmailMCPClient] Updated integration:`, {
              id: updated.id,
              hasAccessToken: !!updated.accessToken,
              hasRefreshToken: !!updated.refreshToken,
              tokenExpiresAt: updated.tokenExpiresAt,
            });
            
            return fetchedToken;
          } else {
            console.error(`[GmailMCPClient] Gmail account found but no token in credentials`);
            console.error(`[GmailMCPClient] Credentials object:`, JSON.stringify(gmailAccount.credentials, null, 2));
          }
        } else {
          console.error(`[GmailMCPClient] Gmail account found but no credentials property`);
        }
      } else {
        console.error(`[GmailMCPClient] No Gmail account found in ${accounts.length} accounts`);
      }
    } catch (pipedreamError: any) {
      console.error(`[GmailMCPClient] Failed to fetch from Pipedream Connect:`, pipedreamError);
      console.error(`[GmailMCPClient] Error details:`, {
        message: pipedreamError.message,
        stack: pipedreamError.stack,
        response: pipedreamError.response,
      });
    }

    // If still no token, try to refresh if we have a refresh token
    const refreshToken = integration.refreshToken || (integration.config as any)?.refreshToken;
    if (refreshToken) {
      console.log(`[GmailMCPClient] Attempting to refresh token...`);
      try {
        const refreshed = await pipedream.refreshToken(integration.id);
        console.log(`[GmailMCPClient] Token refreshed successfully`);
        
        // Update database with refreshed token
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt || null,
          },
        });
        
        return refreshed.accessToken;
      } catch (refreshError: any) {
        console.error(`[GmailMCPClient] Token refresh failed:`, refreshError);
      }
    }

    throw new Error("Gmail access token not found. Please reconnect your Gmail account.");
  }

  /**
   * Get OAuth token for Pipedream API authentication
   */
  private async getPipedreamOAuthToken(): Promise<string> {
    const clientId = process.env.PIPEDREAM_CLIENT_ID!;
    const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET!;
    
    const response = await fetch('https://api.pipedream.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get OAuth token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Connect to Gmail MCP server via Smithery
   * Smithery handles the MCP server hosting and we just need to connect with proper auth
   */
  async connect(): Promise<void> {
    if (this.client) {
      return; // Already connected
    }
  
    const accessToken = await this.getAccessToken();
  
    try {
      // Smithery Gmail MCP server URL
      const serverUrl = new URL("https://server.smithery.ai/gmail");
  
      // Use StreamableHTTPClientTransport - supports authentication headers
      const transport = new StreamableHTTPClientTransport(serverUrl, {
        // Custom fetch implementation with Authorization header
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers);
          headers.set('Authorization', `Bearer ${accessToken}`);
          headers.set('Content-Type', 'application/json');
          
          return fetch(url, {
            ...init,
            headers,
          });
        }
      });
  
      // Create MCP client
      this.client = new Client(
        { 
          name: "unified-box-gmail-client", 
          version: "1.0.0" 
        },
        { capabilities: {} }
      );
  
      // Connect to the Smithery-hosted Gmail MCP server
      await this.client.connect(transport);
      
      console.log(`[GmailMCPClient] Successfully connected to Gmail MCP server via Smithery`);
    } catch (error: any) {
      console.error("[GmailMCPClient] Failed to connect to Gmail MCP server:", error);
      console.error("[GmailMCPClient] Error details:", {
        message: error.message,
        stack: error.stack,
        error: error,
      });
      throw new Error(`Gmail MCP connection failed: ${error.message}`);
    }
  }
  /**
   * List available tools
   */
  async listTools() {
    if (!this.client) {
      await this.connect();
    }
    return await this.client!.listTools();
  }

  /**
   * Call a Gmail MCP tool
   */
  async callTool(name: string, args: Record<string, any>) {
    if (!this.client) {
      await this.connect();
    }
    
    try {
      const result = await this.client!.callTool({
        name,
        arguments: args,
      });
      
      return result;
    } catch (error: any) {
      console.error(`[GmailMCPClient] Error calling tool ${name}:`, error);
      throw new Error(`Failed to call ${name}: ${error.message}`);
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log(`[GmailMCPClient] Disconnected from Gmail MCP server`);
    }
  }
}

/**
 * Get Gmail MCP client for a user
 */
export async function getGmailMCPClient(userId: string, teamId: string | null = null): Promise<GmailMCPClient> {
  const client = new GmailMCPClient(userId, teamId);
  await client.connect();
  return client;
}