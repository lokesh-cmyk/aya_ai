import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

interface InstagramAccount {
  id: string;
  username?: string;
  status: string;
}

/** GET - Returns Composio connection status. Instagram returns array of accounts; others return boolean. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false });
    }

    const composio = getComposio();
    const list = await composio.connectedAccounts.list({
      userIds: [session.user.id],
      statuses: ["ACTIVE"],
      toolkitSlugs: [
        COMPOSIO_APPS.googlecalendar.slug,
        COMPOSIO_APPS.clickup.slug,
        COMPOSIO_APPS.instagram.slug,
        COMPOSIO_APPS.linkedin.slug,
      ],
    });

    const items = (list as { items?: Array<any> }).items ?? [];

    // Separate Instagram accounts (multi-account) from others (boolean)
    const instagramAccounts: InstagramAccount[] = [];
    const otherSlugs = new Set<string>();

    for (const item of items) {
      const slug = (item.toolkit?.slug ?? item.toolkitSlug ?? "").toLowerCase();
      if (slug === COMPOSIO_APPS.instagram.slug.toLowerCase()) {
        instagramAccounts.push({
          id: item.id,
          username: item.metadata?.username || item.connectionParams?.username || undefined,
          status: item.status || "ACTIVE",
        });
      } else if (slug) {
        otherSlugs.add(slug);
      }
    }

    return NextResponse.json({
      googleCalendar: otherSlugs.has(COMPOSIO_APPS.googlecalendar.slug.toLowerCase()),
      clickUp: otherSlugs.has(COMPOSIO_APPS.clickup.slug.toLowerCase()),
      instagram: instagramAccounts,
      linkedin: otherSlugs.has(COMPOSIO_APPS.linkedin.slug.toLowerCase()),
    });
  } catch (e) {
    console.warn("[composio/status]", e);
    return NextResponse.json({ googleCalendar: false, clickUp: false, instagram: [], linkedin: false });
  }
}
