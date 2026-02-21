import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { config } from "./config";
import { apiKeyAuth } from "./middleware/auth";
import { sessionManager } from "./session-manager";
import { getSubscriber, cleanup } from "./redis";
import healthRouter from "./routes/health";
import sessionsRouter from "./routes/sessions";
import messagesRouter from "./routes/messages";

const app = express();
app.use(cors());
app.use(express.json());

// Health check (no auth)
app.use(healthRouter);

// All other routes require API key
app.use(apiKeyAuth);
app.use(sessionsRouter);
app.use(messagesRouter);

const server = createServer(app);

// WebSocket server for real-time events
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  // Validate API key from query param
  const url = new URL(req.url || "", `http://localhost:${config.port}`);
  const apiKey = url.searchParams.get("apiKey");

  if (apiKey !== config.apiKey) {
    ws.close(4001, "Invalid API key");
    return;
  }

  // Client sends subscription messages like:
  // { type: "subscribe", sessionId: "xxx" }
  // { type: "unsubscribe", sessionId: "xxx" }
  const subscriptions = new Set<string>();
  const subscriber = getSubscriber();

  const messageHandler = (channel: string, message: string) => {
    for (const sessionId of subscriptions) {
      if (
        channel === `wa:qr:${sessionId}` ||
        channel === `wa:status:${sessionId}` ||
        channel === `wa:msg:${sessionId}`
      ) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ channel, data: JSON.parse(message) }));
        }
      }
    }
  };

  subscriber.on("message", messageHandler);

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "subscribe" && msg.sessionId) {
        subscriptions.add(msg.sessionId);
        await subscriber.subscribe(
          `wa:qr:${msg.sessionId}`,
          `wa:status:${msg.sessionId}`,
          `wa:msg:${msg.sessionId}`
        );
      }

      if (msg.type === "unsubscribe" && msg.sessionId) {
        subscriptions.delete(msg.sessionId);
        await subscriber.unsubscribe(
          `wa:qr:${msg.sessionId}`,
          `wa:status:${msg.sessionId}`,
          `wa:msg:${msg.sessionId}`
        );
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", async () => {
    subscriber.removeListener("message", messageHandler);
    for (const sessionId of subscriptions) {
      await subscriber.unsubscribe(
        `wa:qr:${sessionId}`,
        `wa:status:${sessionId}`,
        `wa:msg:${sessionId}`
      ).catch(() => {});
    }
    subscriptions.clear();
  });
});

// Startup
async function start() {
  console.log(`WhatsApp Bridge starting on port ${config.port}...`);

  // Restore previously connected sessions
  await sessionManager.restoreAllSessions();

  server.listen(config.port, () => {
    console.log(`WhatsApp Bridge running on http://localhost:${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  });
}

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down WhatsApp Bridge...");
  await cleanup();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((err) => {
  console.error("Failed to start WhatsApp Bridge:", err);
  process.exit(1);
});
