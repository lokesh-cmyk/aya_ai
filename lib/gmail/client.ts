/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from 'googleapis';
import { prisma } from "@/lib/prisma";
// import { pipedream } from "@/lib/integrations/pipedream";

/**
 * Gmail Client using Google APIs directly
 * Much simpler and more reliable for background jobs than MCP
 */
export class GmailClient {
  private userId: string;
  private teamId: string | null;
  private gmail: any = null;
  private oauth2Client: any = null;

  constructor(userId: string, teamId: string | null = null) {
    this.userId = userId;
    this.teamId = teamId;
  }

  /**
   * Get OAuth credentials for Gmail
   */
  private async getCredentials(): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
  }> {
    console.log(`[GmailClient] Fetching Gmail integration for user ${this.userId}, team ${this.teamId || 'none'}`);

    // Find integration
    let integration = await prisma.integration.findFirst({
      where: {
        name: "gmail",
        type: "pipedream",
        isActive: true,
        userId: this.userId,
      },
    });

    if (!integration && this.teamId) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          teamId: this.teamId,
        },
      });
    }

    if (!integration) {
      throw new Error("Gmail integration not found. Please connect your Gmail account first.");
    }

    console.log(`[GmailClient] Integration found: ${integration.id}`);

    // Get tokens from either the dedicated columns or config (backwards compatibility)
    const config = integration.config as any;
    const accessToken = integration.accessToken || config?.accessToken;
    const refreshToken = integration.refreshToken || config?.refreshToken;
    const tokenExpiresAt = integration.tokenExpiresAt || 
      (config?.expiresAt ? new Date(config.expiresAt) : null);

    console.log(`[GmailClient] Token status:`, {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresAt: tokenExpiresAt?.toISOString() || 'never',
      isExpired: tokenExpiresAt ? tokenExpiresAt < new Date() : false,
    });

    if (!accessToken) {
      throw new Error("Gmail access token not found. Please reconnect your Gmail account.");
    }

    return {
      accessToken,
      refreshToken,
      expiryDate: tokenExpiresAt ? tokenExpiresAt.getTime() : undefined,
    };
  }

  /**
   * Save refreshed credentials back to database
   */
  private async saveRefreshedCredentials(credentials: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  }): Promise<void> {
    if (!credentials.access_token) return;

    // Find the integration again
    let integration = await prisma.integration.findFirst({
      where: {
        name: "gmail",
        type: "pipedream",
        isActive: true,
        userId: this.userId,
      },
    });

    if (!integration && this.teamId) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "gmail",
          type: "pipedream",
          isActive: true,
          teamId: this.teamId,
        },
      });
    }

    if (!integration) return;

    const config = integration.config as any;
    const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;

    console.log(`[GmailClient] Saving refreshed token, new expiry: ${newExpiresAt?.toISOString() || 'never'}`);

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiresAt: newExpiresAt,
        config: {
          ...config,
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || config?.refreshToken,
          expiresAt: newExpiresAt?.toISOString(),
        },
      },
    });
  }

  /**
   * Initialize Gmail API client with auto-refresh capability
   */
  async connect(): Promise<void> {
    if (this.gmail) {
      return; // Already connected
    }

    try {
      const credentials = await this.getCredentials();

      // Create OAuth2 client with credentials
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiryDate,
      });

      // IMPORTANT: Set up automatic token refresh
      this.oauth2Client.on('tokens', async (tokens: any) => {
        console.log('[GmailClient] Tokens refreshed automatically by Google OAuth2 client');
        
        // Save the new tokens to database
        await this.saveRefreshedCredentials(tokens);
      });

      // Create Gmail client
      this.gmail = google.gmail({
        version: 'v1',
        auth: this.oauth2Client,
      });

      console.log(`[GmailClient] Successfully connected to Gmail API with auto-refresh enabled`);
    } catch (error: any) {
      console.error("[GmailClient] Failed to connect to Gmail API:", error);
      throw new Error(`Gmail connection failed: ${error.message}`);
    }
  }

  /**
   * Reconnect with fresh token (force refresh)
   */
  private async reconnect(): Promise<void> {
    console.log(`[GmailClient] Forcing reconnection with fresh token...`);
    this.gmail = null;
    this.oauth2Client = null;
    await this.connect();
  }

  /**
   * Execute API call with automatic retry on auth failure
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if it's an authentication error
      const isAuthError = 
        error.message?.toLowerCase().includes('authentication') || 
        error.message?.toLowerCase().includes('invalid') ||
        error.message?.toLowerCase().includes('credentials') ||
        error.code === 401 || 
        error.code === 403;

      if (isAuthError) {
        console.log(`[GmailClient] Authentication failed on ${operationName}, attempting to refresh and reconnect...`);
        
        try {
          await this.reconnect();
          console.log(`[GmailClient] Retrying ${operationName} after reconnection...`);
          return await operation();
        } catch (retryError: any) {
          console.error(`[GmailClient] Retry failed on ${operationName}:`, retryError);
          throw new Error(`Authentication failed after retry: ${retryError.message}`);
        }
      }
      
      // Not an auth error, re-throw
      throw error;
    }
  }

  /**
   * Search for emails
   */
  async searchEmails(query: string, maxResults: number = 20): Promise<any[]> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });
      return response.data.messages || [];
    }, 'searchEmails');
  }

  /**
   * Get email by ID
   */
  async getEmail(messageId: string): Promise<any> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      return response.data;
    }, 'getEmail');
  }

  /**
   * Get all labels
   */
  async getLabels(): Promise<any[]> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      return response.data.labels || [];
    }, 'getLabels');
  }

  /**
   * Create a new label with color
   */
  async createLabel(
    labelName: string, 
    color?: { backgroundColor: string; textColor: string }
  ): Promise<any> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      const requestBody: any = {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      };

      // Add color if provided
      if (color) {
        requestBody.color = {
          backgroundColor: color.backgroundColor,
          textColor: color.textColor,
        };
      }

      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody,
      });
      
      console.log(`[GmailClient] Created label "${labelName}" with color:`, color);
      
      return response.data;
    }, 'createLabel');
  }

  /**
   * Apply label to an email (creates label if it doesn't exist)
   */
  async applyLabel(messageId: string, labelName: string): Promise<{ labelId: string; created: boolean }> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Get all labels
      const labels = await this.getLabels();
      
      // Find existing label (case-insensitive)
      let label = labels.find(
        (l: any) => l.name.toLowerCase() === labelName.toLowerCase()
      );
      
      let created = false;
      
      // Create label if it doesn't exist (without color - will be added separately)
      if (!label) {
        console.log(`[GmailClient] Creating new label: ${labelName}`);
        label = await this.createLabel(labelName);
        created = true;
      } else {
        console.log(`[GmailClient] Using existing label: ${labelName} (${label.id})`);
      }
      
      // Apply label to message
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id],
        },
      });
      
      console.log(`[GmailClient] Label "${labelName}" applied to message ${messageId}`);
      
      return {
        labelId: label.id,
        created,
      };
    }, 'applyLabel');
  }

  /**
   * Apply label to an email WITH COLOR (creates label with color if it doesn't exist)
   */
  async applyLabelWithColor(
    messageId: string, 
    labelName: string,
    color: { backgroundColor: string; textColor: string }
  ): Promise<{ labelId: string; created: boolean }> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Get all labels
      const labels = await this.getLabels();
      
      // Find existing label (case-insensitive)
      let label = labels.find(
        (l: any) => l.name.toLowerCase() === labelName.toLowerCase()
      );
      
      let created = false;
      
      // Create label if it doesn't exist
      if (!label) {
        console.log(`[GmailClient] Creating new label with color: ${labelName}`, color);
        label = await this.createLabel(labelName, color);
        created = true;
      } else {
        console.log(`[GmailClient] Using existing label: ${labelName} (${label.id})`);
        
        // Update color if label exists but has different color
        if (label.color?.backgroundColor !== color.backgroundColor || 
            label.color?.textColor !== color.textColor) {
          console.log(`[GmailClient] Updating label color for: ${labelName}`);
          await this.updateLabelColor(label.id, color);
        }
      }
      
      // Apply label to message
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id],
        },
      });
      
      console.log(`[GmailClient] Label "${labelName}" with color applied to message ${messageId}`);
      
      return {
        labelId: label.id,
        created,
      };
    }, 'applyLabelWithColor');
  }

  /**
   * Update label color
   */
  async updateLabelColor(
    labelId: string,
    color: { backgroundColor: string; textColor: string }
  ): Promise<void> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      await this.gmail.users.labels.patch({
        userId: 'me',
        id: labelId,
        requestBody: {
          color: {
            backgroundColor: color.backgroundColor,
            textColor: color.textColor,
          },
        },
      });
      
      console.log(`[GmailClient] Updated color for label ${labelId}`);
    }, 'updateLabelColor');
  }

  /**
   * Remove label from an email
   */
  async removeLabel(messageId: string, labelId: string): Promise<void> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: [labelId],
        },
      });
      
      console.log(`[GmailClient] Label ${labelId} removed from message ${messageId}`);
    }, 'removeLabel');
  }

  /**
   * Move email to a Gmail category
   * Categories are system labels: CATEGORY_PERSONAL, CATEGORY_SOCIAL, etc.
   */
  async moveToCategory(messageId: string, categoryLabelId: string): Promise<void> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Get current message to see existing category labels
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'minimal',
      });
      
      const currentLabels = message.data.labelIds || [];
      
      // Check if the email already has this category
      if (currentLabels.includes(categoryLabelId)) {
        console.log(`[GmailClient] Email ${messageId} already in category ${categoryLabelId}, skipping`);
        return;
      }
      
      // Find existing category labels to remove (excluding the one we want to add)
      const categoryLabelsToRemove = currentLabels.filter((label: string) => 
        label.startsWith('CATEGORY_') && label !== categoryLabelId
      );
      
      // Build the request body
      const requestBody: any = {};
      
      // Only add if not already present
      if (!currentLabels.includes(categoryLabelId)) {
        requestBody.addLabelIds = [categoryLabelId];
      }
      
      // Only remove if there are categories to remove
      if (categoryLabelsToRemove.length > 0) {
        requestBody.removeLabelIds = categoryLabelsToRemove;
      }
      
      // Only make the API call if there's something to change
      if (requestBody.addLabelIds || requestBody.removeLabelIds) {
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody,
        });
        
        console.log(`[GmailClient] Email ${messageId} moved to category ${categoryLabelId}`);
      } else {
        console.log(`[GmailClient] No changes needed for email ${messageId}`);
      }
    }, 'moveToCategory');
  }

  /**
   * Send email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }): Promise<any> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Create email message
      const email = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${options.to}`,
        ...(options.cc ? [`Cc: ${options.cc}`] : []),
        ...(options.bcc ? [`Bcc: ${options.bcc}`] : []),
        `Subject: ${options.subject}`,
        '',
        options.body,
      ].join('\n');

      // Encode email
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      return response.data;
    }, 'sendEmail');
  }

  /**
   * Reply to an email (maintains thread)
   */
  async replyToEmail(options: {
    to: string;
    subject: string;
    body: string;
    threadId: string;
    messageId: string; // Original message's Message-ID header
    cc?: string;
  }): Promise<any> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Ensure subject has Re: prefix
      const replySubject = options.subject.startsWith('Re:')
        ? options.subject
        : `Re: ${options.subject}`;

      // Create email with threading headers
      const email = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${options.to}`,
        ...(options.cc ? [`Cc: ${options.cc}`] : []),
        `Subject: ${replySubject}`,
        `In-Reply-To: ${options.messageId}`,
        `References: ${options.messageId}`,
        '',
        options.body,
      ].join('\n');

      // Encode email
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: options.threadId,
        },
      });

      console.log(`[GmailClient] Reply sent to thread ${options.threadId}`);
      return response.data;
    }, 'replyToEmail');
  }

  /**
   * Create draft
   */
  async createDraft(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }): Promise<any> {
    if (!this.gmail) {
      await this.connect();
    }

    return this.executeWithRetry(async () => {
      // Create email message
      const email = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${options.to}`,
        ...(options.cc ? [`Cc: ${options.cc}`] : []),
        ...(options.bcc ? [`Bcc: ${options.bcc}`] : []),
        `Subject: ${options.subject}`,
        '',
        options.body,
      ].join('\n');

      // Encode email
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      return response.data;
    }, 'createDraft');
  }
}

/**
 * Get Gmail client for a user
 */
export async function getGmailClient(userId: string, teamId: string | null = null): Promise<GmailClient> {
  const client = new GmailClient(userId, teamId);
  await client.connect();
  return client;
}