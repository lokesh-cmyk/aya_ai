import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bridgeRequest } from "@/lib/whatsapp-bridge";

// GET: List user's WhatsApp sessions
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.whatsAppSession.findMany({
      where: { userId: session.user.id },
      orderBy: { slot: "asc" },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new WhatsApp session (start QR flow)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slot } = await request.json();

    if (!slot || slot < 1 || slot > 3) {
      return NextResponse.json(
        { error: "Slot must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Check if slot is already taken
    const existing = await prisma.whatsAppSession.findUnique({
      where: { userId_slot: { userId: session.user.id, slot } },
    });

    if (existing && existing.status === "connected") {
      return NextResponse.json(
        { error: "Slot already connected" },
        { status: 409 }
      );
    }

    // Create or reuse session record
    const waSession = existing
      ? await prisma.whatsAppSession.update({
          where: { id: existing.id },
          data: { status: "connecting" },
        })
      : await prisma.whatsAppSession.create({
          data: {
            userId: session.user.id,
            slot,
            status: "connecting",
          },
        });

    // Tell bridge to start the Baileys session
    await bridgeRequest("/sessions", {
      method: "POST",
      body: { sessionId: waSession.id },
    });

    return NextResponse.json({ session: waSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
