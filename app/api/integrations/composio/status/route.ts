import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

/** GET - Returns Composio connection status for Google Calendar, ClickUp, Instagram, and LinkedIn */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: false, linkedin: false });
    }

    const composio = getComposio();
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [COMPOSIO_APPS.googlecalendar.slug, COMPOSIO_APPS.clickup.slug, COMPOSIO_APPS.instagram.slug, COMPOSIO_APPS.linkedin.slug],
    });

    const items = (list as { items?: Array<{ toolkit?: { slug?: string }; toolkitSlug?: string }> }).items ?? [];
    const slugs = new Set(
      items.map((i) => (i.toolkit?.slug ?? (i as { toolkitSlug?: string }).toolkitSlug ?? "").toLowerCase()).filter(Boolean)
    );

    return NextResponse.json({
      googleCalendar: slugs.has(COMPOSIO_APPS.googlecalendar.slug.toLowerCase()),
      clickUp: slugs.has(COMPOSIO_APPS.clickup.slug.toLowerCase()),
      instagram: slugs.has(COMPOSIO_APPS.instagram.slug.toLowerCase()),
      linkedin: slugs.has(COMPOSIO_APPS.linkedin.slug.toLowerCase()),
    });
  } catch (e) {
    console.warn("[composio/status]", e);
    return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: false, linkedin: false });
  }
}
