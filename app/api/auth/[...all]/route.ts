import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

/** Normalize thrown value to an Error with a loggable message (handles ErrorEvent and other non-Error values). */
function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if ("message" in e && typeof e.message === "string") return new Error(e.message);
    if ("type" in e) return new Error(`Auth error (${String(e.type)})`);
  }
  return new Error(String(error));
}

async function withErrorHandling(
  fn: (req: NextRequest, context: { params: Promise<{ all: string[] }> }) => Promise<Response>,
  req: NextRequest,
  context: { params: Promise<{ all: string[] }> }
): Promise<Response> {
  try {
    return await fn(req, context);
  } catch (err) {
    const normalized = normalizeAuthError(err);
    console.error("[Auth] Error:", normalized.message, normalized.stack ?? "");
    return NextResponse.json(
      { error: normalized.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ all: string[] }> }
) {
  return withErrorHandling(handler.GET.bind(handler), req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ all: string[] }> }
) {
  return withErrorHandling(handler.POST.bind(handler), req, context);
}

