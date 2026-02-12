/**
 * ClickUp API client for fetching workspace data during CRM import.
 * Uses Composio's proxy execution to handle OAuth authentication internally.
 */

import { getComposio, COMPOSIO_APPS } from "@/lib/composio-tools";

// ---------------------------------------------------------------------------
// ClickUp API response types
// ---------------------------------------------------------------------------

export interface ClickUpWorkspace {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: Array<{ user: { id: number; username: string; email: string } }>;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  color: string | null;
  private: boolean;
  statuses: ClickUpStatus[];
}

export interface ClickUpStatus {
  id?: string;
  status: string;
  type: string; // "open" | "custom" | "closed" | "done"
  orderindex: number;
  color: string;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  hidden: boolean;
  space: { id: string };
  lists: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status: { status: string; color: string; hide_label: boolean } | null;
  folder: { id: string; name: string; hidden: boolean } | null;
  space: { id: string; name: string };
  statuses: ClickUpStatus[];
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description: string | null;
  text_content: string | null;
  status: { status: string; color: string; type: string; orderindex: number };
  priority: { id: string; priority: string; color: string; orderindex: string } | null;
  date_created: string; // epoch ms
  date_updated: string; // epoch ms
  due_date: string | null; // epoch ms or null
  start_date: string | null;
  tags: ClickUpTag[];
  list: { id: string; name: string };
  folder: { id: string; name: string } | null;
  space: { id: string };
  assignees: Array<{ id: number; username: string; email: string }>;
}

// ---------------------------------------------------------------------------
// Priority mapping: ClickUp (1=Urgent..4=Low) → CRM enum
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<string, "URGENT" | "HIGH" | "NORMAL" | "LOW"> = {
  "1": "URGENT",
  "2": "HIGH",
  "3": "NORMAL",
  "4": "LOW",
};

export function mapClickUpPriority(
  priority: ClickUpTask["priority"]
): "URGENT" | "HIGH" | "NORMAL" | "LOW" {
  if (!priority) return "NORMAL";
  return PRIORITY_MAP[priority.id] ?? "NORMAL";
}

// ---------------------------------------------------------------------------
// Generate a 4-char task ID (same pattern used in CRM)
// ---------------------------------------------------------------------------

export function generateTaskId(): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Get ClickUp connected account ID from Composio
// ---------------------------------------------------------------------------

export async function getClickUpConnectionId(
  userId: string
): Promise<string | null> {
  const composio = getComposio();
  const clickupSlug = COMPOSIO_APPS.clickup.slug;

  const list = await composio.connectedAccounts.list({
    userIds: [userId],
    statuses: ["ACTIVE"],
    toolkitSlugs: [clickupSlug],
  });

  const items =
    (
      list as {
        items?: Array<{
          id: string;
          toolkit?: { slug?: string };
          toolkitSlug?: string;
        }>;
      }
    ).items ?? [];

  const connection = items.find((i) => {
    const slug = (
      i.toolkit?.slug ??
      i.toolkitSlug ??
      ""
    ).toLowerCase();
    return slug === clickupSlug.toLowerCase();
  });

  if (!connection) {
    console.warn(
      "[clickup] No active ClickUp connection found for user",
      userId,
      "| items returned:",
      items.length
    );
    return null;
  }

  return connection.id;
}

// ---------------------------------------------------------------------------
// ClickUp API Client (via Composio proxy)
// ---------------------------------------------------------------------------

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export class ClickUpClient {
  private composio;

  constructor(private connectedAccountId: string) {
    this.composio = getComposio();
  }

  private async request<T>(path: string): Promise<T> {
    const endpoint = `${CLICKUP_API_BASE}${path}`;

    // Use Composio's proxy to make authenticated requests
    // Composio handles OAuth token injection internally
    // Note: runtime schema expects camelCase `connectedAccountId` but TS type uses snake_case
    const response = await this.composio.tools.proxyExecute({
      connectedAccountId: this.connectedAccountId,
      endpoint,
      method: "GET",
    } as Parameters<typeof this.composio.tools.proxyExecute>[0]);

    const rawData = (response as { data?: unknown }).data;

    // Composio proxy may return the data as a JSON string or as a parsed object
    let data: unknown = rawData;
    if (typeof rawData === "string") {
      try {
        data = JSON.parse(rawData);
      } catch {
        throw new Error(`ClickUp proxy returned unparseable string for ${path}: ${String(rawData).slice(0, 200)}`);
      }
    }

    if (!data) {
      console.error("[clickup] Proxy returned no data for", path, "| raw response keys:", Object.keys(response as object));
      throw new Error(`ClickUp proxy request returned no data for ${path}`);
    }

    return data as T;
  }

  /** Get all workspaces the user has access to */
  async getWorkspaces(): Promise<ClickUpWorkspace[]> {
    const data = await this.request<{ teams: ClickUpWorkspace[] }>("/team");
    return data.teams ?? [];
  }

  /** Get all spaces in a workspace */
  async getSpaces(workspaceId: string): Promise<ClickUpSpace[]> {
    const data = await this.request<{ spaces: ClickUpSpace[] }>(
      `/team/${workspaceId}/space?archived=false`
    );
    return data.spaces ?? [];
  }

  /** Get all folders in a space */
  async getFolders(spaceId: string): Promise<ClickUpFolder[]> {
    const data = await this.request<{ folders: ClickUpFolder[] }>(
      `/space/${spaceId}/folder?archived=false`
    );
    return data.folders ?? [];
  }

  /** Get all lists in a folder */
  async getLists(folderId: string): Promise<ClickUpList[]> {
    const data = await this.request<{ lists: ClickUpList[] }>(
      `/folder/${folderId}/list?archived=false`
    );
    return data.lists ?? [];
  }

  /** Get all folderless lists in a space */
  async getFolderlessLists(spaceId: string): Promise<ClickUpList[]> {
    const data = await this.request<{ lists: ClickUpList[] }>(
      `/space/${spaceId}/list?archived=false`
    );
    return data.lists ?? [];
  }

  /** Get all tasks in a list (paginated, fetches all pages) */
  async getTasks(listId: string): Promise<ClickUpTask[]> {
    const allTasks: ClickUpTask[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await this.request<{
        tasks: ClickUpTask[];
        last_page: boolean;
      }>(
        `/list/${listId}/task?archived=false&include_closed=true&page=${page}&subtasks=true`
      );

      allTasks.push(...(data.tasks ?? []));
      hasMore = !data.last_page;
      page++;

      // Safety: max 50 pages (5000 tasks per list)
      if (page > 50) break;
    }

    return allTasks;
  }
}
