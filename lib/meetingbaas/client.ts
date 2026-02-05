import type {
  CreateCalendarRequest,
  CreateCalendarResponse,
  ListCalendarEventsResponse,
  ScheduleRecordingRequest,
  ScheduleRecordingResponse,
  DeployBotRequest,
  DeployBotResponse,
  ListBotsResponse,
  DeleteBotResponse,
  RetranscribeRequest,
  RetranscribeResponse,
  Transcript,
} from "./types";

const MEETINGBAAS_API_BASE = "https://api.meetingbaas.com";

// MeetingBaas v2 bot data structure
interface BotV2Data {
  bot_id: string;
  bot_name?: string;
  meeting_url?: string;
  meeting_platform?: string;
  recording_mode?: string;
  status: string;
  created_at?: string;
  joined_at?: string;
  exited_at?: string;
  duration_seconds?: number;
  participants?: Array<{ name?: string; id?: number; profile_picture?: string }>;
  speakers?: Array<{ name?: string; id?: number; profile_picture?: string }>;
  video?: string;
  audio?: string;
  mp4?: string;
  transcription?: string;
  transcript_url?: string;
  diarization?: string;
  recording_url?: string;
  error_code?: string | null;
  error_message?: string | null;
  extra?: Record<string, unknown> | null;
}

export class MeetingBaasError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "MeetingBaasError";
  }
}

export class MeetingBaasClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MEETINGBAAS_API_KEY || "";
    this.baseUrl = MEETINGBAAS_API_BASE;

    if (!this.apiKey) {
      throw new MeetingBaasError(
        "MeetingBaas API key is required. Set MEETINGBAAS_API_KEY environment variable."
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-meeting-baas-api-key": this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `MeetingBaas API error: ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
        errorCode = errorJson.code;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new MeetingBaasError(errorMessage, response.status, errorCode);
    }

    return response.json();
  }

  // Calendar API Methods (v2)

  /**
   * Create a calendar connection with MeetingBaas (v2 API)
   */
  async createCalendar(
    data: CreateCalendarRequest
  ): Promise<CreateCalendarResponse> {
    return this.request<CreateCalendarResponse>("/v2/calendars", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * List calendar events (v2 API)
   */
  async listCalendarEvents(
    calendarUuid: string,
    startTime: Date,
    endTime: Date
  ): Promise<ListCalendarEventsResponse> {
    const params = new URLSearchParams({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    return this.request<ListCalendarEventsResponse>(
      `/v2/calendars/${calendarUuid}/events?${params.toString()}`,
      { method: "GET" }
    );
  }

  /**
   * Schedule a bot to join a calendar event (v2 API)
   */
  async scheduleRecording(
    data: ScheduleRecordingRequest
  ): Promise<ScheduleRecordingResponse> {
    return this.request<ScheduleRecordingResponse>("/v2/calendars/recordings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Schedule a bot for a specific calendar event (v2 API)
   */
  async scheduleCalendarBot(
    calendarId: string,
    eventId: string,
    data: {
      bot_name?: string;
      bot_image?: string;
      entry_message?: string;
      recording_mode?: string;
      webhook_url?: string;
      speech_to_text?: { provider: string };
    }
  ): Promise<DeployBotResponse> {
    return this.request<DeployBotResponse>(
      `/v2/calendars/${calendarId}/events/${eventId}/bot`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  // Bot API Methods (v2)

  /**
   * Deploy a bot to join a meeting immediately (v2 API)
   */
  async deployBot(data: DeployBotRequest): Promise<DeployBotResponse> {
    return this.request<DeployBotResponse>("/v2/bots", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Schedule a bot to join a meeting at a specific time (v2 API)
   */
  async scheduleBotV2(data: {
    meeting_url: string;
    bot_name?: string;
    bot_image?: string;
    entry_message?: string;
    recording_mode?: string;
    webhook_url?: string;
    speech_to_text?: { provider: string };
    automatic_leave?: { waiting_room_timeout?: number };
    join_at: string; // ISO datetime
  }): Promise<DeployBotResponse> {
    return this.request<DeployBotResponse>("/v2/bots/scheduled", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * List all bots with optional filters (v2 API)
   */
  async listBots(filters?: {
    status?: string;
    meeting_url?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListBotsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/v2/bots?${queryString}` : "/v2/bots";

    return this.request<ListBotsResponse>(endpoint, { method: "GET" });
  }

  /**
   * Get a specific bot by ID (v2 API)
   * MeetingBaas v2 returns: { success: true, data: { bot_id, status, video, audio, ... } }
   * Note: The bot data is directly in 'data', not 'data.bot'
   */
  async getBot(
    botId: string
  ): Promise<{ success: boolean; data?: BotV2Data; error?: string }> {
    try {
      console.log(`[MeetingBaas] Fetching bot: ${botId}`);
      const response = await this.request<{ success?: boolean; data?: BotV2Data } | BotV2Data>(
        `/v2/bots/${botId}`,
        { method: "GET" }
      );

      console.log(`[MeetingBaas] Bot response received`);

      // MeetingBaas v2 returns { success: true, data: {...} } where data contains the bot info
      if ('success' in response && 'data' in response) {
        return { success: true, data: response.data };
      }

      // Direct bot object (fallback)
      if ('bot_id' in response && 'status' in response) {
        return { success: true, data: response as BotV2Data };
      }

      // Return as-is
      return { success: true, data: response as BotV2Data };
    } catch (error) {
      console.error(`[MeetingBaas] Error fetching bot ${botId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bot",
      };
    }
  }

  /**
   * Remove a bot from a meeting (v2 API)
   */
  async deleteBot(botId: string): Promise<DeleteBotResponse> {
    return this.request<DeleteBotResponse>(`/v2/bots/${botId}`, {
      method: "DELETE",
    });
  }

  /**
   * Retranscribe a meeting recording (v2 API)
   */
  async retranscribe(data: RetranscribeRequest): Promise<RetranscribeResponse> {
    return this.request<RetranscribeResponse>("/v2/bots/retranscribe", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Fetch transcript from a transcript URL
   */
  async fetchTranscript(transcriptUrl: string): Promise<Transcript> {
    const response = await fetch(transcriptUrl, {
      headers: {
        "x-meeting-baas-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new MeetingBaasError(
        `Failed to fetch transcript: ${response.status}`,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Get the webhook URL for this application
   */
  static getWebhookUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/webhooks/meetingbaas`;
  }
}

// Singleton instance
let clientInstance: MeetingBaasClient | null = null;

export function getMeetingBaasClient(): MeetingBaasClient {
  if (!clientInstance) {
    clientInstance = new MeetingBaasClient();
  }
  return clientInstance;
}

export * from "./types";
export type { BotV2Data };
