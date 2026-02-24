/**
 * Tool display name mapping and result summarizer for AI chat tool call UI cards.
 *
 * Used by the SSE streaming endpoint (stream/route.ts) to convert raw Composio
 * tool names into human-friendly display names and generate short summaries
 * from tool result payloads.
 */

// ---------------------------------------------------------------------------
// Display name mapping
// ---------------------------------------------------------------------------

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Composio meta tools
  COMPOSIO_SEARCH_TOOLS: "Search Available Tools",
  COMPOSIO_MANAGE_CONNECTIONS: "Manage Connections",
  COMPOSIO_GET_TOOL_SCHEMAS: "Get Tool Schemas",
  COMPOSIO_MULTI_EXECUTE_TOOL: "Execute Actions",
  COMPOSIO_EXECUTE_TOOL: "Execute Action",
  COMPOSIO_REMOTE_WORKBENCH: "Remote Workbench",

  // ClickUp
  CLICKUP_GET_TASKS: "Get Tasks",
  CLICKUP_CREATE_TASK: "Create Task",
  CLICKUP_UPDATE_TASK: "Update Task",
  CLICKUP_GET_SPACES: "Get Spaces",
  CLICKUP_GET_LISTS: "Get Lists",
  CLICKUP_GET_TASK: "Get Task",
  CLICKUP_GET_FOLDERS: "Get Folders",

  // Google Calendar
  GOOGLECALENDAR_LIST_EVENTS: "List Events",
  GOOGLECALENDAR_CREATE_EVENT: "Create Event",
  GOOGLECALENDAR_UPDATE_EVENT: "Update Event",
  GOOGLECALENDAR_DELETE_EVENT: "Delete Event",
  GOOGLECALENDAR_FIND_FREE_SLOTS: "Find Free Slots",
  GOOGLECALENDAR_GET_CALENDAR: "Get Calendar",

  // Instagram
  INSTAGRAM_GET_INSIGHTS: "Get Insights",
  INSTAGRAM_GET_MEDIA: "Get Media",
  INSTAGRAM_SEND_MESSAGE: "Send Message",

  // LinkedIn
  LINKEDIN_CREATE_LINKED_IN_POST: "Create Post",
  LINKEDIN_DELETE_LINKED_IN_POST: "Delete Post",
  LINKEDIN_GET_COMPANY_INFO: "Get Company Info",
  LINKEDIN_GET_MY_INFO: "Get My Info",
  LINKEDIN_CREATE_COMMENT_ON_POST: "Comment on Post",
  LINKEDIN_GET_IMAGES: "Get Images",
  LINKEDIN_GET_VIDEO: "Get Video",
  LINKEDIN_GET_VIDEOS: "Get Videos",
  LINKEDIN_REGISTER_IMAGE_UPLOAD: "Register Image Upload",

  // Microsoft Teams
  MICROSOFT_TEAMS_ADD_MEMBER_TO_TEAM: "Add Team Member",
  MICROSOFT_TEAMS_ARCHIVE_TEAM: "Archive Team",
  MICROSOFT_TEAMS_CHATS_GET_ALL_CHATS: "List Teams Chats",
  MICROSOFT_TEAMS_CHATS_GET_ALL_MESSAGES: "Get Chat Messages",
  MICROSOFT_TEAMS_CREATE_MEETING: "Create Teams Meeting",
  MICROSOFT_TEAMS_CREATE_TEAM: "Create Team",
  MICROSOFT_TEAMS_DELETE_TEAM: "Delete Team",
  MICROSOFT_TEAMS_GET_CHANNEL: "Get Channel Details",
  MICROSOFT_TEAMS_GET_CHAT_MESSAGE: "Get Chat Message",
  MICROSOFT_TEAMS_GET_MY_PROFILE: "Get My Profile",
  MICROSOFT_TEAMS_GET_TEAM: "Get Team Details",
  MICROSOFT_TEAMS_GET_TEAM_OPERATION: "Get Operation Status",
  MICROSOFT_TEAMS_LIST_MESSAGE_REPLIES: "List Message Replies",
  MICROSOFT_TEAMS_LIST_TEAM_MEMBERS: "List Team Members",
  MICROSOFT_TEAMS_LIST_TEAMS_TEMPLATES: "List Team Templates",
  MICROSOFT_TEAMS_LIST_USER_JOINED_TEAMS: "List Joined Teams",
  MICROSOFT_TEAMS_LIST_USERS: "List Organization Users",
  MICROSOFT_TEAMS_SEARCH_FILES: "Search Teams Files",
  MICROSOFT_TEAMS_SEARCH_MESSAGES: "Search Teams Messages",
  MICROSOFT_TEAMS_TEAMS_CREATE_CHANNEL: "Create Channel",
  MICROSOFT_TEAMS_TEAMS_CREATE_CHAT: "Create Chat",
  MICROSOFT_TEAMS_TEAMS_GET_MESSAGE: "Get Channel Message",
  MICROSOFT_TEAMS_TEAMS_LIST: "List Teams",
  MICROSOFT_TEAMS_TEAMS_LIST_CHANNEL_MESSAGES: "List Channel Messages",
  MICROSOFT_TEAMS_TEAMS_LIST_CHANNELS: "List Channels",
  MICROSOFT_TEAMS_TEAMS_LIST_CHAT_MESSAGES: "List Chat Messages",
  MICROSOFT_TEAMS_TEAMS_LIST_PEOPLE: "List People",
  MICROSOFT_TEAMS_TEAMS_POST_CHANNEL_MESSAGE: "Post Channel Message",
  MICROSOFT_TEAMS_TEAMS_POST_CHAT_MESSAGE: "Send Chat Message",
  MICROSOFT_TEAMS_TEAMS_POST_MESSAGE_REPLY: "Reply to Message",
  MICROSOFT_TEAMS_UNARCHIVE_TEAM: "Unarchive Team",
  MICROSOFT_TEAMS_UPDATE_CHANNEL_MESSAGE: "Update Channel Message",
  MICROSOFT_TEAMS_UPDATE_CHAT_MESSAGE: "Update Chat Message",
  MICROSOFT_TEAMS_UPDATE_TEAM: "Update Team Settings",

  // Zoom
  ZOOM_ADD_A_MEETING_REGISTRANT: "Add Meeting Registrant",
  ZOOM_ADD_A_WEBINAR_REGISTRANT: "Add Webinar Registrant",
  ZOOM_CREATE_A_MEETING: "Create Meeting",
  ZOOM_DELETE_A_MEETING: "Delete Meeting",
  ZOOM_DELETE_MEETING_RECORDINGS: "Delete Meeting Recordings",
  ZOOM_GET_A_MEETING: "Get Meeting Details",
  ZOOM_GET_A_MEETING_SUMMARY: "Get Meeting Summary",
  ZOOM_GET_A_WEBINAR: "Get Webinar Details",
  ZOOM_GET_DAILY_USAGE_REPORT: "Get Daily Usage Report",
  ZOOM_GET_MEETING_RECORDINGS: "Get Meeting Recordings",
  ZOOM_GET_PAST_MEETING_PARTICIPANTS: "Get Past Meeting Participants",
  ZOOM_GET_USER: "Get User Profile",
  ZOOM_LIST_ALL_RECORDINGS: "List All Recordings",
  ZOOM_LIST_ARCHIVED_FILES: "List Archived Files",
  ZOOM_LIST_DEVICES: "List Devices",
  ZOOM_LIST_MEETINGS: "List Meetings",
  ZOOM_LIST_WEBINAR_PARTICIPANTS: "List Webinar Participants",
  ZOOM_LIST_WEBINARS: "List Webinars",
  ZOOM_UPDATE_A_MEETING: "Update Meeting",

  // Web Search & Weather
  web_search: "Web Search",
  get_weather: "Get Weather",
};

/**
 * Convert a raw Composio tool/action name (e.g. "CLICKUP_GET_TASKS") into a
 * human-friendly display name (e.g. "Get Tasks").
 *
 * Falls back to converting SCREAMING_SNAKE_CASE to Title Case when the tool
 * name is not in the known mapping.
 */
export function getToolDisplayName(toolName: string): string {
  const mapped = TOOL_DISPLAY_NAMES[toolName];
  if (mapped) return mapped;

  // Fallback: SCREAMING_SNAKE_CASE -> Title Case
  return toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ---------------------------------------------------------------------------
// Result summarizer
// ---------------------------------------------------------------------------

/**
 * Context-aware labels: map tool-name keywords to the noun used when counting
 * array results (e.g. CLICKUP_GET_TASKS -> "tasks").
 */
function itemLabelForTool(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (lower.includes("task")) return "tasks";
  if (lower.includes("event") || lower.includes("calendar")) return "events";
  if (lower.includes("message")) return "messages";
  if (lower.includes("space")) return "spaces";
  if (lower.includes("list")) return "lists";
  if (lower.includes("folder")) return "folders";
  if (lower.includes("image")) return "images";
  if (lower.includes("video")) return "videos";
  if (lower.includes("post")) return "posts";
  if (lower.includes("comment")) return "comments";
  if (lower.includes("insight")) return "insights";
  if (lower.includes("media")) return "media items";
  if (lower.includes("channel")) return "channels";
  if (lower.includes("team")) return "teams";
  if (lower.includes("member")) return "members";
  if (lower.includes("people")) return "people";
  if (lower.includes("user")) return "users";
  if (lower.includes("file")) return "files";
  if (lower.includes("chat")) return "chats";
  if (lower.includes("meeting")) return "meetings";
  if (lower.includes("template")) return "templates";
  if (lower.includes("repl")) return "replies";
  if (lower.includes("recording")) return "recordings";
  if (lower.includes("webinar")) return "webinars";
  if (lower.includes("device")) return "devices";
  if (lower.includes("participant")) return "participants";
  if (lower.includes("registrant")) return "registrants";
  if (lower.includes("search")) return "results";
  if (lower.includes("weather")) return "weather data";
  if (lower.includes("tool")) return "tools";
  return "items";
}

/**
 * Generate a short, human-readable summary string from a tool call result.
 *
 * Handles the most common Composio response shapes:
 *   - null / undefined
 *   - plain strings (possibly JSON-encoded)
 *   - arrays (counted with context-aware labels)
 *   - objects with common wrapper keys (data, tasks, events, items, results, tools)
 *   - objects with connectLink, message, or successful fields
 */
export function summarizeToolResult(toolName: string, result: unknown): string {
  // 1. Null / undefined
  if (result == null) return "Completed";

  // 2. String results
  if (typeof result === "string") {
    // Attempt to parse as JSON and re-summarize the parsed value
    try {
      const parsed = JSON.parse(result);
      return summarizeToolResult(toolName, parsed);
    } catch {
      // Not JSON – return truncated string
      if (result.length <= 80) return result;
      return result.slice(0, 77) + "...";
    }
  }

  // 3. Array results
  if (Array.isArray(result)) {
    const label = itemLabelForTool(toolName);
    return `Found ${result.length} ${label}`;
  }

  // 4. Object results
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;

    // Check common wrapper keys that hold the "real" collection payload
    const wrapperKeys = ["data", "tasks", "events", "items", "results", "tools"] as const;
    for (const key of wrapperKeys) {
      if (key in obj && Array.isArray(obj[key])) {
        const arr = obj[key] as unknown[];
        const label = key === "data" || key === "results" || key === "items"
          ? itemLabelForTool(toolName)
          : key;
        return `Found ${arr.length} ${label}`;
      }
    }

    // connectLink – the user needs to authorize an app
    if ("connectLink" in obj && typeof obj.connectLink === "string") {
      return "Connection required";
    }

    // message field
    if ("message" in obj && typeof obj.message === "string") {
      const msg = obj.message;
      if (msg.length <= 80) return msg;
      return msg.slice(0, 77) + "...";
    }

    // successful boolean
    if ("successful" in obj) {
      return obj.successful ? "Completed successfully" : "Action failed";
    }
  }

  // 5. Fallback
  return "Completed successfully";
}
