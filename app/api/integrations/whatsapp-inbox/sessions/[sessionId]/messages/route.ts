import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

// GET: Fetch messages for a chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const chatId = request.nextUrl.searchParams.get("chatId");
    const limit = request.nextUrl.searchParams.get("limit") || "50";

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await bridgeRequest<{ messages: unknown[] }>(
      `/sessions/${sessionId}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`
    );

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send text message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waSession = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    if (!waSession || waSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { chatId, text } = await request.json();

    const data = await bridgeRequest(`/sessions/${sessionId}/send/text`, {
      method: "POST",
      body: { chatId, text },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
