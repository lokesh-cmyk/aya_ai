import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComposio, getIntegrationsCallbackUrl, COMPOSIO_APPS } from "@/lib/composio-tools";

const APPS = ["googlecalendar", "clickup", "instagram", "linkedin"] as const;

/**
 * GET ?app=googlecalendar|clickup|instagram|linkedin&redirect=true
 * Returns Composio connect URL for the app, or redirects directly to OAuth if redirect=true
 * Use redirect=true when calling from AI chat agentic UI
 */
export async function GET(request: NextRequest) {
  const shouldRedirect = request.nextUrl.searchParams.get("redirect") === "true";

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      // If redirect mode and not authenticated, redirect to login
      if (shouldRedirect) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const app = request.nextUrl.searchParams.get("app")?.toLowerCase();
    if (!app || !APPS.includes(app as (typeof APPS)[number])) {
      if (shouldRedirect) {
        return NextResponse.redirect(new URL("/settings/integrations?error=invalid_app", request.url));
      }
      return NextResponse.json({ error: "Invalid app. Use app=googlecalendar, app=clickup, app=instagram, or app=linkedin" }, { status: 400 });
    }

    const config = COMPOSIO_APPS[app as (typeof APPS)[number]];
    if (!config.authConfigId) {
      if (shouldRedirect) {
        return NextResponse.redirect(new URL(`/settings/integrations?error=${app}_not_configured`, request.url));
      }
      return NextResponse.json({ error: `${config.name} is not configured` }, { status: 400 });
    }

    const composio = getComposio();

    // Use AI chat callback URL when in redirect mode (coming from chat), settings callback otherwise
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const callbackUrl = shouldRedirect ? `${baseUrl}/ai-chat` : getIntegrationsCallbackUrl();

    // For Instagram: check existing connections and enforce max 3 limit
    let allowMultiple = false;
    if (app === "instagram") {
      const existing = await composio.connectedAccounts.list({
        userIds: [session.user.id],
        statuses: ["ACTIVE"],
        toolkitSlugs: [config.slug],
      });
      const existingCount = ((existing as any).items ?? []).length;
      if (existingCount >= 3) {
        if (shouldRedirect) {
          return NextResponse.redirect(new URL("/settings/integrations?error=instagram_max_accounts", request.url));
        }
        return NextResponse.json({ error: "Maximum 3 Instagram accounts allowed" }, { status: 400 });
      }
      if (existingCount > 0) {
        allowMultiple = true;
      }
    }

    const linkOptions: any = { callbackUrl };
    if (allowMultiple) {
      linkOptions.allowMultiple = true;
    }
    const connectionRequest = await composio.connectedAccounts.link(session.user.id, config.authConfigId, linkOptions);

    const url = (connectionRequest as { redirectUrl?: string }).redirectUrl ?? (connectionRequest as { redirect_url?: string }).redirect_url;
    if (!url || typeof url !== "string") {
      if (shouldRedirect) {
        return NextResponse.redirect(new URL("/settings/integrations?error=connect_failed", request.url));
      }
      return NextResponse.json({ error: "Failed to get connect URL" }, { status: 500 });
    }

    // If redirect=true, redirect directly to OAuth URL
    if (shouldRedirect) {
      return NextResponse.redirect(url);
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error("[composio/connect]", e);
    if (shouldRedirect) {
      return NextResponse.redirect(new URL("/settings/integrations?error=connect_failed", request.url));
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get connect URL" },
      { status: 500 }
    );
  }
}
