/**
 * Classify incoming WhatsApp messages as "simple" or "complex"
 *
 * Simple: processed directly in webhook (greetings, web search, weather, general Q&A)
 * Complex: queued via Inngest (Slack, email, calendar, tasks, project stats — anything needing Composio tools)
 */

// Keywords that indicate the message needs integrated service access
const COMPLEX_KEYWORDS = [
  // Slack
  "slack", "dm", "dms", "direct message", "channel",
  // Email
  "email", "emails", "inbox", "mail", "mails", "gmail", "outlook",
  // Calendar
  "calendar", "meeting", "meetings", "schedule", "event", "events", "appointment",
  // Tasks / Projects
  "task", "tasks", "project", "projects", "clickup", "sprint", "deadline",
  "todo", "to-do", "to do", "backlog", "roadmap",
  // CRM
  "contact", "contacts", "lead", "leads", "crm",
  // Analytics
  "stats", "statistics", "analytics", "report", "dashboard", "insights",
  // Instagram / LinkedIn
  "instagram", "linkedin", "social media", "post", "posts",
  // Meetings
  "transcript", "recording", "action items", "standup",
];

// Patterns that are definitely simple regardless of keywords
const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|hola|namaste|bonjour|hallo|ciao|ola)/i,
  /^(good\s*(morning|afternoon|evening|night))/i,
  /^(thanks|thank you|thx)/i,
  /^(bye|goodbye|see you|ttyl)/i,
  /^(ok|okay|sure|got it|alright)/i,
  // Digest opt-in/opt-out
  /\b(opt\s*out|opt\s*in|stop|resume|pause|disable|enable)\b.*\b(digest|standup|daily|morning)\b/i,
  /\b(digest|standup|daily|morning)\b.*\b(opt\s*out|opt\s*in|stop|resume|pause|disable|enable)\b/i,
];

export type MessageIntent = "simple" | "complex";

/**
 * Classify a message intent using keyword heuristics.
 * Fast path — no LLM call needed for most messages.
 *
 * Returns "simple" for general chat, web search, weather, greetings.
 * Returns "complex" for anything needing integrated service access.
 */
export function classifyIntent(message: string): MessageIntent {
  const lower = message.toLowerCase().trim();

  // Check simple patterns first (greetings, confirmations, digest opt-out)
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(lower)) {
      return "simple";
    }
  }

  // Check for complex keywords
  for (const keyword of COMPLEX_KEYWORDS) {
    if (lower.includes(keyword)) {
      return "complex";
    }
  }

  // Default: simple (general chat, web search, weather, etc.)
  return "simple";
}

/**
 * Check if a message is a digest opt-out/opt-in request
 */
export function isDigestToggle(message: string): { isToggle: boolean; enable: boolean } {
  const lower = message.toLowerCase().trim();

  const optOutPatterns = [
    /\b(stop|disable|pause|opt\s*out|turn\s*off|no\s*more)\b.*\b(digest|standup|daily|morning)\b/i,
    /\b(digest|standup|daily|morning)\b.*\b(stop|disable|pause|opt\s*out|turn\s*off|no\s*more)\b/i,
    /\bdon'?t\s*send\b.*\b(digest|standup|daily|morning)\b/i,
  ];

  const optInPatterns = [
    /\b(start|enable|resume|opt\s*in|turn\s*on)\b.*\b(digest|standup|daily|morning)\b/i,
    /\b(digest|standup|daily|morning)\b.*\b(start|enable|resume|opt\s*in|turn\s*on)\b/i,
  ];

  for (const pattern of optOutPatterns) {
    if (pattern.test(lower)) return { isToggle: true, enable: false };
  }
  for (const pattern of optInPatterns) {
    if (pattern.test(lower)) return { isToggle: true, enable: true };
  }

  return { isToggle: false, enable: false };
}
