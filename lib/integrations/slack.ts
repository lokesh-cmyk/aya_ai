/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";

/**
 * Slack Client for fetching messages from connected Slack workspaces
 */
export class SlackClient {
  private userId: string;
  private teamId: string | null;

  constructor(userId: string, teamId: string | null = null) {
    this.userId = userId;
    this.teamId = teamId;
  }

  /**
   * Get OAuth access token for Slack
   */
  private async getAccessToken(): Promise<string> {
    console.log(`[SlackClient] Fetching Slack integration for user ${this.userId}, team ${this.teamId || 'none'}`);

    // Find integration
    let integration = await prisma.integration.findFirst({
      where: {
        name: "slack",
        type: "pipedream",
        isActive: true,
        userId: this.userId,
      },
    });

    if (!integration && this.teamId) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "slack",
          type: "pipedream",
          isActive: true,
          teamId: this.teamId,
        },
      });
    }

    if (!integration) {
      throw new Error("Slack integration not found. Please connect your Slack account first.");
    }

    console.log(`[SlackClient] Integration found: ${integration.id}`);

    // Get tokens from either the dedicated columns or config (backwards compatibility)
    const config = integration.config as any;
    let accessToken = integration.accessToken || config?.accessToken;
    let refreshToken = integration.refreshToken || config?.refreshToken;
    let tokenExpiresAt: Date | null = integration.tokenExpiresAt ?? 
      (config?.expiresAt ? new Date(config.expiresAt) : null);

    console.log(`[SlackClient] Token status:`, {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresAt: tokenExpiresAt?.toISOString() || 'never',
      isExpired: tokenExpiresAt ? tokenExpiresAt < new Date() : false,
    });

    // Check if token needs refresh (5 minute buffer OR already expired)
    const now = new Date();
    const needsRefresh = tokenExpiresAt && 
      (tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000 || tokenExpiresAt <= now);
    
    if (needsRefresh && refreshToken) {
      console.log(`[SlackClient] Token expired or expiring soon, refreshing...`);
      try {
        const { pipedream } = await import('@/lib/integrations/pipedream');
        const newTokens = await pipedream.refreshToken(integration.id);
        accessToken = newTokens.accessToken;
        tokenExpiresAt = newTokens.expiresAt ?? null; // Convert undefined to null
        console.log(`[SlackClient] Token refreshed successfully`);
      } catch (error: any) {
        console.error(`[SlackClient] Failed to refresh token:`, error.message);
        throw new Error(`Failed to refresh Slack token: ${error.message}`);
      }
    }

    if (!accessToken) {
      throw new Error("No Slack access token available. Please reconnect your Slack account.");
    }

    return accessToken;
  }

  /**
   * Get selected channels from integration config
   */
  private async getSelectedChannels(): Promise<string[]> {
    let integration = await prisma.integration.findFirst({
      where: {
        name: "slack",
        type: "pipedream",
        isActive: true,
        userId: this.userId,
      },
    });

    if (!integration && this.teamId) {
      integration = await prisma.integration.findFirst({
        where: {
          name: "slack",
          type: "pipedream",
          isActive: true,
          teamId: this.teamId,
        },
      });
    }

    if (!integration) {
      return [];
    }

    const config = integration.config as any;
    return config?.selectedChannels || [];
  }

  /**
   * Fetch messages from selected Slack channels
   */
  async fetchMessages(limit: number = 50): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    const selectedChannels = await this.getSelectedChannels();

    if (selectedChannels.length === 0) {
      console.log(`[SlackClient] No channels selected for user ${this.userId}`);
      console.log(`[SlackClient] Please select channels in integration settings`);
      return [];
    }

    console.log(`[SlackClient] Fetching messages from ${selectedChannels.length} channels:`, selectedChannels);

    const allMessages: any[] = [];

    // Fetch messages from each selected channel
    for (const channelId of selectedChannels) {
      try {
        const response = await fetch(
          `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(`[SlackClient] Failed to fetch messages from channel ${channelId}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        if (!data.ok) {
          console.error(`[SlackClient] Slack API error for channel ${channelId}:`, data.error);
          continue;
        }

        // Get channel info for better context
        let channelName = channelId;
        try {
          const channelInfoResponse = await fetch(
            `https://slack.com/api/conversations.info?channel=${channelId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (channelInfoResponse.ok) {
            const channelInfo = await channelInfoResponse.json();
            if (channelInfo.ok && channelInfo.channel) {
              channelName = channelInfo.channel.name || channelId;
            }
          }
        } catch (err) {
          console.warn(`[SlackClient] Failed to get channel info for ${channelId}:`, err);
        }

        // Transform Slack messages to our format
        const messages = (data.messages || []).map((msg: any) => ({
          id: msg.ts || msg.client_msg_id || `slack_${channelId}_${msg.ts}`,
          content: msg.text || '',
          channel: 'SLACK' as const,
          direction: 'INBOUND' as const,
          status: 'DELIVERED' as const,
          externalId: msg.ts,
          metadata: {
            channelId,
            channelName,
            userId: msg.user,
            threadTs: msg.thread_ts,
            replyCount: msg.reply_count || 0,
            reactions: msg.reactions || [],
            attachments: msg.files || [],
            subtype: msg.subtype,
          },
          createdAt: msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString() : new Date().toISOString(),
        }));

        allMessages.push(...messages);
      } catch (error: any) {
        console.error(`[SlackClient] Error fetching messages from channel ${channelId}:`, error.message);
        continue;
      }
    }

    // Sort by creation date (newest first)
    allMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allMessages.slice(0, limit);
  }

  /**
   * Get list of available channels in the workspace
   */
  async listChannels(): Promise<Array<{ id: string; name: string; isPrivate: boolean }>> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return (data.channels || []).map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private || false,
      }));
    } catch (error: any) {
      console.error(`[SlackClient] Error listing channels:`, error.message);
      throw error;
    }
  }

  /**
   * Send a message to a Slack channel
   * @param channelId - The channel ID to send the message to
   * @param text - The message text
   * @param threadTs - Optional thread timestamp to reply to a thread
   */
  async sendMessage(channelId: string, text: string, threadTs?: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const payload: any = {
        channel: channelId,
        text: text,
      };

      // If threadTs is provided, reply to that thread
      if (threadTs) {
        payload.thread_ts = threadTs;
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      console.log(`[SlackClient] Message sent successfully:`, data.message?.ts);
      return data;
    } catch (error: any) {
      console.error(`[SlackClient] Error sending message:`, error.message);
      throw error;
    }
  }

  /**
   * Upload a file to Slack
   * @param channelId - The channel ID to upload the file to
   * @param file - The file to upload (File object or Buffer)
   * @param filename - The filename
   * @param initialComment - Optional comment to add with the file
   * @param threadTs - Optional thread timestamp to upload to a thread
   */
  async uploadFile(
    channelId: string,
    file: File | Buffer,
    filename: string,
    initialComment?: string,
    threadTs?: string
  ): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      // Convert file to buffer
      const fileBuffer = file instanceof File 
        ? Buffer.from(await file.arrayBuffer())
        : file;
      
      // Step 1: Get upload URL using files.getUploadURLExternal
      // Slack API expects form-encoded data, not JSON
      const formData = new URLSearchParams();
      formData.append('filename', filename);
      formData.append('length', fileBuffer.length.toString());
      
      const uploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
      }

      const uploadUrlData = await uploadUrlResponse.json();

      if (!uploadUrlData.ok) {
        console.error('[SlackClient] Upload URL error response:', uploadUrlData);
        throw new Error(`Slack API error getting upload URL: ${uploadUrlData.error}`);
      }

      const upload_url = uploadUrlData.upload_url;
      const file_id = uploadUrlData.file_id;

      if (!upload_url || !file_id) {
        console.error('[SlackClient] Missing upload_url or file_id:', uploadUrlData);
        throw new Error('Invalid response from Slack: missing upload_url or file_id');
      }

      // Step 2: Upload file to the provided URL
      // Convert Buffer to Uint8Array for fetch
      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(fileBuffer),
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file to external URL: ${uploadResponse.statusText}`);
      }

      // Step 3: Complete the upload using files.completeUploadExternal
      // This endpoint accepts JSON with the files array
      const completePayload: any = {
        files: [
          {
            id: file_id,
            title: filename,
          }
        ],
        channel_id: channelId,
      };

      if (initialComment) {
        completePayload.initial_comment = initialComment;
      }

      // Note: thread_ts is not directly supported in files.completeUploadExternal
      // We'll send a separate message to the thread after file upload if needed

      const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completePayload),
      });

      if (!completeResponse.ok) {
        throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
      }

      const completeData = await completeResponse.json();

      if (!completeData.ok) {
        throw new Error(`Slack API error completing upload: ${completeData.error}`);
      }

      console.log(`[SlackClient] File uploaded successfully:`, file_id);
      
      // If threadTs was provided, we need to send the file as a reply to the thread
      // The file is already shared in the channel, but we can optionally send a message
      let messageTs = completeData.files?.[0]?.shares?.public?.[channelId]?.[0]?.ts;
      
      if (threadTs && messageTs) {
        // Optionally send a message in the thread mentioning the file
        // The file is already in the channel, this is just for thread context
        try {
          const threadMessage = await this.sendMessage(
            channelId,
            initialComment || `File: ${filename}`,
            threadTs
          );
          messageTs = threadMessage.message?.ts || messageTs;
        } catch (err) {
          console.warn('[SlackClient] Failed to send thread message, file is still uploaded:', err);
        }
      }
      
      // Return data in similar format to old API for compatibility
      return {
        ok: true,
        file: {
          id: file_id,
          name: filename,
          url_private: completeData.files?.[0]?.url_private || completeData.files?.[0]?.url_private_download || '',
        },
        message: completeData.files?.[0] ? {
          ts: messageTs || threadTs,
          text: initialComment || '',
        } : undefined,
        channel: channelId,
      };
    } catch (error: any) {
      console.error(`[SlackClient] Error uploading file:`, error.message);
      throw error;
    }
  }

  /**
   * Get user info by user ID
   */
  async getUserInfo(userId: string): Promise<{ id: string; name: string; real_name?: string; email?: string } | null> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(
        `https://slack.com/api/users.info?user=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        console.warn(`[SlackClient] Failed to get user info for ${userId}:`, data.error);
        return null;
      }

      return {
        id: data.user?.id || userId,
        name: data.user?.name || 'Unknown',
        real_name: data.user?.real_name,
        email: data.user?.profile?.email,
      };
    } catch (error: any) {
      console.error(`[SlackClient] Error fetching user info:`, error.message);
      return null;
    }
  }
}
