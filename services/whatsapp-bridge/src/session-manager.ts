import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  ConnectionState,
  WAMessage,
  jidNormalizedUser,
  isJidGroup,
  getContentType,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import pino from "pino";

import { prisma } from "./prisma";
import { usePostgresAuthState, deleteAuthState } from "./auth-store";
import { publish } from "./redis";
import { config } from "./config";
import {
  ChatInfo,
  MessageInfo,
  redisChannels,
} from "./types";

const logger = pino({ level: "warn" });

class SessionManager {
  private sockets: Map<string, WASocket> = new Map();

  async createSession(sessionId: string): Promise<void> {
    if (this.sockets.has(sessionId)) {
      throw new Error(`Session ${sessionId} already active`);
    }

    await prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { status: "connecting" },
    });

    const { state, saveState } = await usePostgresAuthState(sessionId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      generateHighQualityLinkPreview: true,
      getMessage: async () => {
        return { conversation: "" };
      },
    });

    this.sockets.set(sessionId, sock);

    sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          const qrImage = await QRCode.toDataURL(qr);
          await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: "qr_ready" },
          }).catch(() => {});
          await publish(redisChannels.qr(sessionId), {
            sessionId,
            qr: qrImage,
          });
        }

        if (connection === "open") {
          const phone = sock.user?.id
            ? jidNormalizedUser(sock.user.id).split("@")[0]
            : null;
          const displayName = sock.user?.name || null;

          await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: {
              status: "connected",
              phone: phone ? `+${phone}` : null,
              displayName,
              lastSeen: new Date(),
            },
          }).catch(() => {});

          await publish(redisChannels.status(sessionId), {
            sessionId,
            status: "connected",
            phone: phone ? `+${phone}` : null,
            displayName,
          });

          await saveState();
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.sockets.delete(sessionId);

          if (shouldReconnect) {
            setTimeout(() => this.createSession(sessionId), 3000);
          } else {
            await deleteAuthState(sessionId);
            await prisma.whatsAppSession.update({
              where: { id: sessionId },
              data: { status: "disconnected", phone: null, displayName: null },
            }).catch(() => {});
            await publish(redisChannels.status(sessionId), {
              sessionId,
              status: "disconnected",
            });
          }
        }
      } catch (err) {
        console.error(`connection.update error for session ${sessionId}:`, err);
      }
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        if (isJidGroup(msg.key.remoteJid || "")) continue;

        const parsed = this.parseMessage(msg);
        if (parsed) {
          await publish(redisChannels.message(sessionId), {
            sessionId,
            chatId: msg.key.remoteJid,
            message: parsed,
          });
        }
      }

      await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: { lastSeen: new Date() },
      }).catch(() => {});
    });
  }

  async destroySession(sessionId: string): Promise<void> {
    const sock = this.sockets.get(sessionId);
    if (sock) {
      await sock.logout().catch(() => {});
      this.sockets.delete(sessionId);
    }
    await deleteAuthState(sessionId);
    await prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { status: "disconnected", phone: null, displayName: null, profilePicUrl: null },
    });
    await publish(redisChannels.status(sessionId), {
      sessionId,
      status: "disconnected",
    });
  }

  async getChats(sessionId: string): Promise<ChatInfo[]> {
    this.getSocket(sessionId);
    // Baileys doesn't have a direct getChats()
    // For MVP, return empty. Chats populate as messages arrive via Redis events.
    return [];
  }

  async getMessages(
    sessionId: string,
    chatId: string,
    limit: number = 50
  ): Promise<MessageInfo[]> {
    const sock = this.getSocket(sessionId);

    const messages = await (sock as any).fetchMessageHistory?.(limit, {
      remoteJid: chatId,
    }).catch(() => []) || [];

    return (messages as WAMessage[])
      .map((msg) => this.parseMessage(msg))
      .filter((m): m is MessageInfo => m !== null)
      .reverse();
  }

  async sendText(sessionId: string, chatId: string, text: string): Promise<WAMessage | undefined> {
    const sock = this.getSocket(sessionId);
    return sock.sendMessage(chatId, { text });
  }

  async sendMedia(
    sessionId: string,
    chatId: string,
    buffer: Buffer,
    mimetype: string,
    filename?: string,
    caption?: string
  ): Promise<WAMessage | undefined> {
    const sock = this.getSocket(sessionId);

    if (mimetype.startsWith("image/")) {
      return sock.sendMessage(chatId, { image: buffer, mimetype, caption });
    } else if (mimetype.startsWith("video/")) {
      return sock.sendMessage(chatId, { video: buffer, mimetype, caption });
    } else {
      return sock.sendMessage(chatId, {
        document: buffer,
        mimetype,
        fileName: filename || "file",
        caption,
      });
    }
  }

  async sendAudio(sessionId: string, chatId: string, buffer: Buffer): Promise<WAMessage | undefined> {
    const sock = this.getSocket(sessionId);
    return sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });
  }

  async getPairingCode(sessionId: string, phone: string): Promise<string> {
    const sock = this.getSocket(sessionId);
    const cleaned = phone.replace(/[^0-9]/g, "");
    const code = await sock.requestPairingCode(cleaned);
    return code;
  }

  getStatus(sessionId: string): string {
    return this.sockets.has(sessionId) ? "active" : "inactive";
  }

  getActiveSessionCount(): number {
    return this.sockets.size;
  }

  async restoreAllSessions(): Promise<void> {
    const sessions = await prisma.whatsAppSession.findMany({
      where: { status: { in: ["connected", "connecting", "qr_ready"] } },
    });

    console.log(`Restoring ${sessions.length} WhatsApp sessions...`);

    for (const session of sessions) {
      try {
        await this.createSession(session.id);
        console.log(`Restored session ${session.id} (slot ${session.slot})`);
      } catch (err) {
        console.error(`Failed to restore session ${session.id}:`, err);
        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { status: "disconnected" },
        });
      }
    }
  }

  private getSocket(sessionId: string): WASocket {
    const sock = this.sockets.get(sessionId);
    if (!sock) {
      throw new Error(`Session ${sessionId} not active`);
    }
    return sock;
  }

  private parseMessage(msg: WAMessage): MessageInfo | null {
    if (!msg.message || !msg.key.id) return null;

    const contentType = getContentType(msg.message);
    if (!contentType) return null;

    let content = "";
    let type: MessageInfo["type"] = "other";
    let caption: string | undefined;
    let mimetype: string | undefined;
    let filename: string | undefined;

    switch (contentType) {
      case "conversation":
        content = msg.message.conversation || "";
        type = "text";
        break;
      case "extendedTextMessage":
        content = msg.message.extendedTextMessage?.text || "";
        type = "text";
        break;
      case "imageMessage":
        caption = msg.message.imageMessage?.caption || undefined;
        mimetype = msg.message.imageMessage?.mimetype || undefined;
        content = caption || "[Image]";
        type = "image";
        break;
      case "videoMessage":
        caption = msg.message.videoMessage?.caption || undefined;
        mimetype = msg.message.videoMessage?.mimetype || undefined;
        content = caption || "[Video]";
        type = "video";
        break;
      case "audioMessage":
        mimetype = msg.message.audioMessage?.mimetype || undefined;
        content = "[Audio]";
        type = "audio";
        break;
      case "documentMessage":
        filename = msg.message.documentMessage?.fileName || undefined;
        mimetype = msg.message.documentMessage?.mimetype || undefined;
        content = filename || "[Document]";
        type = "document";
        break;
      case "stickerMessage":
        content = "[Sticker]";
        type = "sticker";
        break;
      default:
        content = `[${contentType}]`;
        type = "other";
    }

    let quotedMessage: MessageInfo["quotedMessage"] | undefined;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      const quotedType = getContentType(quoted);
      quotedMessage = {
        id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || "",
        content:
          quoted?.conversation ||
          quoted?.extendedTextMessage?.text ||
          `[${quotedType}]`,
      };
    }

    return {
      id: msg.key.id!,
      chatId: msg.key.remoteJid || "",
      content,
      timestamp: msg.messageTimestamp
        ? typeof msg.messageTimestamp === "number"
          ? msg.messageTimestamp
          : (msg.messageTimestamp as any).low
        : Date.now() / 1000,
      fromMe: msg.key.fromMe || false,
      senderName: msg.pushName || undefined,
      type,
      mimetype,
      filename,
      caption,
      quotedMessage,
    };
  }
}

export const sessionManager = new SessionManager();
