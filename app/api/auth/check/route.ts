import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error("[Auth Check] Error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
