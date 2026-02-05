import { NextResponse } from "next/server";

/**
 * Returns which social sign-in providers are enabled (have credentials configured).
 * Use this on the login page to show/hide provider buttons and avoid 500s when
 * a provider is not configured.
 */
export async function GET() {
  const google =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return NextResponse.json({ google });
}
