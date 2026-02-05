/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '@/lib/prisma';

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  teamId: string;
  createdAt: Date;
  fileUrl?: string;
  fileName?: string;
}

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  teamId: string;
}

class ChatWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection[]> = new Map(); // teamId -> clients

  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/api/chat/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Extract userId and teamId from query params or headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const teamId = url.searchParams.get('teamId');

      if (!userId || !teamId) {
        ws.close(1008, 'Missing userId or teamId');
        return;
      }

      // Add client to team's connection list
      if (!this.clients.has(teamId)) {
        this.clients.set(teamId, []);
      }
      this.clients.get(teamId)!.push({ ws, userId, teamId });

      console.log(`[ChatWS] User ${userId} connected to team ${teamId}`);

      // Handle incoming messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(teamId, userId, message);
        } catch (error) {
          console.error('[ChatWS] Error handling message:', error);
          ws.send(JSON.stringify({ error: 'Failed to process message' }));
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        const teamClients = this.clients.get(teamId);
        if (teamClients) {
          const index = teamClients.findIndex((c) => c.userId === userId);
          if (index > -1) {
            teamClients.splice(index, 1);
          }
          if (teamClients.length === 0) {
            this.clients.delete(teamId);
          }
        }
        console.log(`[ChatWS] User ${userId} disconnected from team ${teamId}`);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({ type: 'connected', userId, teamId }));
    });

    console.log('[ChatWS] WebSocket server initialized');
  }

  private async handleMessage(teamId: string, userId: string, message: any) {
    // This is just for WebSocket communication
    // Actual message saving happens via API route
    if (message.type === 'ping') {
      // Respond to ping
      this.broadcastToTeam(teamId, { type: 'pong', userId });
    }
  }

  // Broadcast message to all clients in a team
  broadcastToTeam(teamId: string, data: any) {
    const teamClients = this.clients.get(teamId);
    if (!teamClients) return;

    const message = JSON.stringify(data);
    teamClients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Broadcast new message to team
  async broadcastNewMessage(teamId: string, message: ChatMessage) {
    const fullMessage = await prisma.teamChat.findUnique({
      where: { id: message.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    this.broadcastToTeam(teamId, {
      type: 'new_message',
      message: fullMessage,
    });
  }

  // Broadcast message read status
  broadcastMessageRead(teamId: string, chatId: string, userId: string) {
    this.broadcastToTeam(teamId, {
      type: 'message_read',
      chatId,
      userId,
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
    }
  }
}

export const chatWebSocketServer = new ChatWebSocketServer();
