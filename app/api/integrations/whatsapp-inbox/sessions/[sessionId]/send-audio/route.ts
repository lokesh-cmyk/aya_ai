import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/app/generated/prisma";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
const BRIDGE_API_KEY = process.env.WHATSAPP_BRIDGE_API_KEY || "";

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

    const formData = await request.formData();

    const res = await fetch(`${BRIDGE_URL}/sessions/${sessionId}/send/audio`, {
      method: "POST",
      headers: { "x-api-key": BRIDGE_API_KEY },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
