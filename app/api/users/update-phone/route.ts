import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { whatsappPhone } = body;

    if (!whatsappPhone || typeof whatsappPhone !== "string") {
      return NextResponse.json(
        { error: "whatsappPhone is required" },
        { status: 400 }
      );
    }

    // Basic phone validation: must start with + and contain digits
    const cleaned = whatsappPhone.replace(/[\s\-()]/g, "");
    if (!/^\+\d{7,15}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Invalid phone number. Use international format (e.g. +1234567890)" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappPhone: cleaned,
        whatsappLinkedAt: new Date(),
      },
      select: {
        id: true,
        whatsappPhone: true,
        whatsappLinkedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    // Handle unique constraint violation (phone already linked to another user)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This WhatsApp number is already linked to another account" },
        { status: 409 }
      );
    }

    console.error("Update phone error:", error);
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}
