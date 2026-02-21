export interface SessionInfo {
  id: string;
  userId: string;
  slot: number;
  phone: string | null;
  displayName: string | null;
  profilePicUrl: string | null;
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  lastSeen: Date | null;
}

export interface ChatInfo {
  id: string; // WhatsApp JID (e.g., 919876543210@s.whatsapp.net)
  name: string;
  phone: string;
  profilePicUrl?: string;
  lastMessage?: {
    content: string;
    timestamp: number;
    fromMe: boolean;
  };
  unreadCount: number;
  isGroup: boolean;
}

export interface MessageInfo {
  id: string;
  chatId: string;
  content: string;
  timestamp: number;
  fromMe: boolean;
  senderName?: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "other";
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  quotedMessage?: {
    id: string;
    content: string;
  };
}

export interface QREvent {
  sessionId: string;
  qr: string; // base64 encoded QR image
}

export interface StatusEvent {
  sessionId: string;
  status: SessionInfo["status"];
  phone?: string;
  displayName?: string;
}

export interface IncomingMessageEvent {
  sessionId: string;
  chatId: string;
  message: MessageInfo;
}

// Redis channel helpers
export const redisChannels = {
  qr: (sessionId: string) => `wa:qr:${sessionId}`,
  status: (sessionId: string) => `wa:status:${sessionId}`,
  message: (sessionId: string) => `wa:msg:${sessionId}`,
};
