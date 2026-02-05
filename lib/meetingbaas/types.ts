// MeetingBaas API Types

export type MeetingPlatform = "Google" | "Outlook";
export type RecordingMode = "speaker_view" | "gallery_view" | "audio_only";

// Calendar API Types
export interface CreateCalendarRequest {
  oauth_client_id: string;
  oauth_client_secret: string;
  oauth_refresh_token: string;
  platform: MeetingPlatform;
  raw_calendar_id?: string;
}

export interface CreateCalendarResponse {
  success: boolean;
  data?: {
    calendar: {
      name: string;
      uuid: string;
    };
  };
  error?: string;
}

export interface CalendarEvent {
  summary: string;
  start_time: string;
  end_time?: string;
  event_id: string;
  meeting_url?: string;
  description?: string;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
}

export interface ListCalendarEventsResponse {
  success: boolean;
  data?: {
    events: CalendarEvent[];
  };
  error?: string;
}

export interface ScheduleRecordingRequest {
  calendar_uuid: string;
  event_id: string;
  bot_config: BotConfig;
}

export interface ScheduleRecordingResponse {
  success: boolean;
  data?: {
    scheduled_recording: {
      id: string;
    };
  };
  error?: string;
}

// Bot API Types
export interface BotConfig {
  bot_name: string;
  bot_image?: string;
  entry_message?: string;
  recording_mode?: RecordingMode;
  speech_to_text?: {
    provider: "Default" | "Gladia" | "AssemblyAI";
  };
  automatic_leave?: {
    waiting_room_timeout?: number; // seconds
    silence_timeout?: number;
    noone_joined_timeout?: number;
  };
}

export interface DeployBotRequest {
  meeting_url: string;
  bot_name: string;
  bot_image?: string;
  entry_message?: string;
  recording_mode?: RecordingMode;
  reserved?: boolean;
  speech_to_text?: {
    provider: "Default" | "Gladia" | "AssemblyAI";
  };
  automatic_leave?: {
    waiting_room_timeout?: number;
  };
  webhook_url?: string;
}

export interface DeployBotResponse {
  success: boolean;
  data?: {
    bot_id: string;
  };
  error?: string;
}

export interface Bot {
  bot_id: string;
  meeting_url: string;
  bot_name: string;
  status: BotStatus;
  created_at: string;
  recording_url?: string;
  transcript_url?: string;
}

export type BotStatus =
  | "queued"
  | "joining"
  | "in_waiting_room"
  | "in_call"
  | "recording"
  | "paused"
  | "ended"
  | "failed";

export interface ListBotsResponse {
  success: boolean;
  data?: {
    bots: Bot[];
  };
  error?: string;
}

export interface DeleteBotResponse {
  success: boolean;
  error?: string;
}

export interface RetranscribeRequest {
  bot_id: string;
  speech_to_text?: {
    provider: "Default" | "Gladia" | "AssemblyAI";
  };
}

export interface RetranscribeResponse {
  success: boolean;
  data?: {
    job_id: string;
  };
  error?: string;
}

// Webhook Event Types
export type WebhookEventType =
  | "complete"
  | "failed"
  | "transcription_complete"
  | "bot.status_change";

export interface WebhookEventBase {
  event: WebhookEventType;
  bot_id: string;
  meeting_url: string;
  created_at: string;
}

export interface WebhookCompleteEvent extends WebhookEventBase {
  event: "complete";
  recording_url: string;
  transcript_url: string;
  duration: number;
  participants: number;
}

export interface WebhookFailedEvent extends WebhookEventBase {
  event: "failed";
  error_code: string;
  error_message: string;
}

export interface WebhookTranscriptionCompleteEvent extends WebhookEventBase {
  event: "transcription_complete";
  transcript_url: string;
}

export interface WebhookBotStatusChangeEvent extends WebhookEventBase {
  event: "bot.status_change";
  status: BotStatus;
  previous_status?: BotStatus;
}

export type WebhookEvent =
  | WebhookCompleteEvent
  | WebhookFailedEvent
  | WebhookTranscriptionCompleteEvent
  | WebhookBotStatusChangeEvent;

// Transcript Types
export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

export interface Transcript {
  segments: TranscriptSegment[];
  full_text: string;
  language: string;
  duration: number;
}
