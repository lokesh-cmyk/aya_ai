/**
 * Composio integration for AI chat: Google Calendar, ClickUp, Instagram.
 * Uses in-chat authentication: COMPOSIO_MANAGE_CONNECTIONS returns Connect Link URL
 * when the user needs to authorize an app.
 */

import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

const toolkitSlugCalendar = process.env.COMPOSIO_TOOLKIT_SLUG || "googlecalendar";
const authConfigIdCalendar = process.env.COMPOSIO_AUTH_CONFIG_ID || "";
const toolkitSlugClickUp = process.env.COMPOSIO_TOOLKIT_SLUG_CLICKUP || "clickup";
const authConfigIdClickUp = process.env.COMPOSIO_AUTH_CONFIG_ID_CLICKUP || "";
const toolkitSlugInstagram = process.env.COMPOSIO_TOOLKIT_SLUG_INSTAGRAM || "instagram";
const authConfigIdInstagram = process.env.COMPOSIO_AUTH_CONFIG_ID_INSTAGRAM || "";
const toolkitSlugLinkedin = process.env.COMPOSIO_TOOLKIT_SLUG_LINKEDIN || "linkedin";
const authConfigIdLinkedin = process.env.COMPOSIO_AUTH_CONFIG_ID_LINKEDIN || "";

/** Composio client (with VercelProvider for tool router). Also used for connectedAccounts.list/link on server. */
export function getComposio(): Composio<InstanceType<typeof VercelProvider>> {
  const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_COMPOSIO_API_KEY is not set");
  }
  return new Composio({
    apiKey,
    provider: new VercelProvider(),
  });
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

function getCallbackUrl(): string {
  return `${getBaseUrl()}/ai-chat`;
}

/** Callback URL after OAuth when connecting from Settings > Integrations page */
export function getIntegrationsCallbackUrl(): string {
  return `${getBaseUrl()}/settings/integrations`;
}

/** Auth config and toolkit slug for each Composio app (for integrations page) */
export const COMPOSIO_APPS = {
  googlecalendar: {
    slug: process.env.COMPOSIO_TOOLKIT_SLUG || "googlecalendar",
    authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID || "",
    name: "Google Calendar",
  },
  clickup: {
    slug: process.env.COMPOSIO_TOOLKIT_SLUG_CLICKUP || "clickup",
    authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID_CLICKUP || "",
    name: "ClickUp",
  },
  instagram: {
    slug: process.env.COMPOSIO_TOOLKIT_SLUG_INSTAGRAM || "instagram",
    authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID_INSTAGRAM || "",
    name: "Instagram",
  },
  linkedin: {
    slug: process.env.COMPOSIO_TOOLKIT_SLUG_LINKEDIN || "linkedin",
    authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID_LINKEDIN || "",
    name: "LinkedIn",
  },
} as const;

/**
 * LinkedIn Composio action names (for reference; actual tools come from session.tools()).
 * LINKEDIN_REGISTER_IMAGE_UPLOAD: initializes a native image upload and returns a presigned
 * upload_url plus asset_urn. Upload image bytes to upload_url, then use asset_urn in
 * LINKEDIN_CREATE_LINKED_IN_POST when creating a post with an image.
 */
export const LINKEDIN_ACTIONS = [
  "LINKEDIN_CREATE_LINKED_IN_POST",
  "LINKEDIN_DELETE_LINKED_IN_POST",
  "LINKEDIN_GET_COMPANY_INFO",
  "LINKEDIN_GET_MY_INFO",
  "LINKEDIN_CREATE_COMMENT_ON_POST",
  "LINKEDIN_GET_IMAGES",
  "LINKEDIN_GET_VIDEO",
  "LINKEDIN_GET_VIDEOS",
  "LINKEDIN_REGISTER_IMAGE_UPLOAD",
] as const;

export interface ComposioSessionTools {
  tools: import("ai").ToolSet;
  sessionId: string;
}

/** Map toolkit slug to display name for Agentic UI */
export function getAppDisplayName(toolkitSlug: string | undefined): string {
  if (!toolkitSlug) return "App";
  const slug = String(toolkitSlug).toLowerCase();
  if (slug === "googlecalendar") return "Google Calendar";
  if (slug === "clickup") return "ClickUp";
  if (slug === "instagram") return "Instagram";
  if (slug === "linkedin") return "LinkedIn";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Create a Composio tool-router session with Google Calendar, ClickUp, and optionally Instagram.
 * In-chat auth (COMPOSIO_MANAGE_CONNECTIONS) with callback URL to /ai-chat.
 */
export async function getComposioSessionTools(userId: string): Promise<ComposioSessionTools> {
  const composio = getComposio();
  const toolkits: string[] = [toolkitSlugCalendar];
  if (authConfigIdClickUp) toolkits.push(toolkitSlugClickUp);
  if (authConfigIdInstagram) toolkits.push(toolkitSlugInstagram);
  if (authConfigIdLinkedin) toolkits.push(toolkitSlugLinkedin);

  const config: Parameters<Composio["create"]>[1] = {
    toolkits,
    manageConnections: {
      callbackUrl: getCallbackUrl(),
    },
  };

  const authConfigs: Record<string, string> = {};
  if (authConfigIdCalendar) authConfigs[toolkitSlugCalendar] = authConfigIdCalendar;
  if (authConfigIdClickUp) authConfigs[toolkitSlugClickUp] = authConfigIdClickUp;
  if (authConfigIdInstagram) authConfigs[toolkitSlugInstagram] = authConfigIdInstagram;
  if (authConfigIdLinkedin) authConfigs[toolkitSlugLinkedin] = authConfigIdLinkedin;
  if (Object.keys(authConfigs).length) config.authConfigs = authConfigs;

  const session = await composio.create(userId, config);
  const tools = await session.tools();
  return { tools: tools as import("ai").ToolSet, sessionId: session.sessionId };
}

/** @deprecated Use getComposioSessionTools for Calendar + ClickUp */
export async function getGoogleCalendarSessionTools(userId: string): Promise<ComposioSessionTools> {
  return getComposioSessionTools(userId);
}
