/* eslint-disable @typescript-eslint/no-explicit-any */
// PipeDream Integration for platform connections
// PipeDream allows users to connect their platforms (Gmail, Slack, etc.) securely

export interface PipeDreamConnection {
  id: string;
  platform: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: Date;
  lastSyncAt?: Date;
  metadata?: Record<string, any>;
}

export interface PipeDreamConfig {
  apiKey: string;
  workspaceId: string;
}

class PipeDreamIntegration {
  private apiKey: string;
  private workspaceId: string;
  private baseUrl = 'https://api.pipedream.com/v1';

  constructor(config: PipeDreamConfig) {
    this.apiKey = config.apiKey;
    this.workspaceId = config.workspaceId;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey || !this.workspaceId) {
      throw new Error(
        "Pipedream is not configured. Set PIPEDREAM_API_KEY and PIPEDREAM_WORKSPACE_ID environment variables."
      );
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const baseMessage =
        (errorBody && (errorBody.message || errorBody.error)) ||
        `Pipedream API error (HTTP ${response.status})`;

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `${baseMessage} — check your PIPEDREAM_API_KEY, PIPEDREAM_WORKSPACE_ID, and Connect app configuration.`
        );
      }

      throw new Error(baseMessage);
    }

    return response.json();
  }

  // Get OAuth URL for platform connection
  async getOAuthUrl(platform: string, redirectUri: string): Promise<string> {
    const response = await this.request('/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify({
        platform,
        redirect_uri: redirectUri,
        workspace_id: this.workspaceId,
      }),
    });

    return response.auth_url;
  }

  // Exchange OAuth code for access token
  async exchangeCode(platform: string, code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    const response = await this.request('/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        platform,
        code,
        redirect_uri: redirectUri,
        workspace_id: this.workspaceId,
      }),
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
    };
  }

  // Store connection in database
  async saveConnection(
    userId: string,
    teamId: string,
    platform: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    }
  ): Promise<PipeDreamConnection> {
    const { prisma } = await import('@/lib/prisma');

    // Find existing integration for this platform and team
    const existing = await prisma.integration.findFirst({
      where: {
        name: platform,
        type: 'pipedream',
        userId: userId,
      },
    });

    const integration = existing
      ? await prisma.integration.update({
          where: { id: existing.id },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
            config: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt?.toISOString(),
              userId,
              teamId,
            },
            isActive: true,
          },
        })
      : await prisma.integration.create({
          data: {
            name: platform,
            type: 'pipedream',
            userId: userId,
            teamId: teamId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
            config: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt?.toISOString(),
              userId,
              teamId,
            },
            isActive: true,
          },
        });

    return {
      id: integration.id,
      platform,
      status: 'connected',
      connectedAt: new Date(integration.createdAt),
      lastSyncAt: new Date(integration.updatedAt),
      metadata: integration.config as Record<string, any>,
    };
  }

  // Get user's connections
  async getConnections(userId: string, teamId?: string): Promise<PipeDreamConnection[]> {
    const { prisma } = await import('@/lib/prisma');

    // Fetch all active pipedream integrations
    const integrations = await prisma.integration.findMany({
      where: {
        type: 'pipedream',
        isActive: true,
      },
    });

    // Filter by userId and teamId
    const filtered = integrations.filter((integration) => {
      const config = integration.config as any;
      
      const matchesUserId = 
        integration.userId === userId ||
        config?.userId === userId;
      
      if (!matchesUserId) return false;
      
      if (teamId) {
        return (
          integration.teamId === teamId ||
          config?.teamId === teamId
        );
      }
      
      return true;
    });

    console.log(`[pipedream.getConnections] Found ${filtered.length} connections for user ${userId}, team ${teamId || 'none'}:`, 
      filtered.map(i => ({ id: i.id, platform: i.name, userId: i.userId, teamId: i.teamId }))
    );

    return filtered.map((integration) => ({
      id: integration.id,
      platform: integration.name,
      status: integration.isActive ? 'connected' : 'disconnected',
      connectedAt: new Date(integration.createdAt),
      lastSyncAt: new Date(integration.updatedAt),
      metadata: integration.config as Record<string, any>,
    }));
  }

  // Disconnect a platform
  async disconnect(connectionId: string): Promise<void> {
    const { prisma } = await import('@/lib/prisma');

    await prisma.integration.update({
      where: { id: connectionId },
      data: { isActive: false },
    });
  }

  // Refresh access token
  async refreshToken(connectionId: string): Promise<{
    accessToken: string;
    expiresAt?: Date;
  }> {
    const { prisma } = await import('@/lib/prisma');

    const integration = await prisma.integration.findUnique({
      where: { id: connectionId },
    });

    if (!integration || !integration.isActive) {
      throw new Error('Connection not found or inactive');
    }

    // Get refresh token from dedicated column or config
    const config = integration.config as any;
    const refreshToken = integration.refreshToken || config?.refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log(`[pipedream.refreshToken] Refreshing token for integration ${connectionId}...`);

    // Call PipeDream API to refresh token
    const response = await this.request('/oauth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken,
        workspace_id: this.workspaceId,
      }),
    });

    const newAccessToken = response.access_token;
    const newExpiresAt = response.expires_at ? new Date(response.expires_at) : undefined;

    console.log(`[pipedream.refreshToken] Token refreshed, new expiry: ${newExpiresAt?.toISOString() || 'never'}`);

    // Update in database - CRITICAL: Update BOTH dedicated columns AND config
    await prisma.integration.update({
      where: { id: connectionId },
      data: {
        accessToken: newAccessToken,
        tokenExpiresAt: newExpiresAt,
        config: {
          ...config,
          accessToken: newAccessToken,
          expiresAt: newExpiresAt?.toISOString(),
        },
      },
    });

    return {
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
    };
  }
}

// Factory function
export function createPipeDreamIntegration(config: PipeDreamConfig): PipeDreamIntegration {
  return new PipeDreamIntegration(config);
}

// Default instance (can be configured via env)
export const pipedream = createPipeDreamIntegration({
  apiKey: process.env.PIPEDREAM_API_KEY || '',
  workspaceId: process.env.PIPEDREAM_WORKSPACE_ID || '',
});