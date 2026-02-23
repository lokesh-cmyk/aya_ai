/**
 * Format meeting insights into a WhatsApp-friendly summary message.
 *
 * Produces a compact message with:
 * - Meeting title + metadata (date, duration, participant count)
 * - Executive summary (2-3 sentences)
 * - Numbered action items with owners
 */

interface ActionItem {
  task: string;
  owner: string;
  deadline?: string | null;
}

interface FormatMeetingSummaryInput {
  title: string;
  scheduledStart: Date;
  duration: number | null; // seconds
  participantCount: number;
  summary: string;
  actionItems: ActionItem[];
  timezone: string;
}

/**
 * Format a date in the user's timezone for WhatsApp display.
 */
function formatMeetingDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

/**
 * Format duration from seconds to human-readable string.
 */
function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "Unknown duration";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Build the WhatsApp message from meeting insights.
 */
export function formatMeetingWhatsAppSummary(
  input: FormatMeetingSummaryInput
): string {
  const {
    title,
    scheduledStart,
    duration,
    participantCount,
    summary,
    actionItems,
    timezone,
  } = input;

  const date = formatMeetingDate(scheduledStart, timezone);
  const durationStr = formatDuration(duration);
  const participantStr =
    participantCount === 1
      ? "1 participant"
      : `${participantCount} participants`;

  let message = `*Meeting Summary: ${title}*\n`;
  message += `_${date} | ${durationStr} | ${participantStr}_\n\n`;

  // Executive summary
  message += `*Executive Summary*\n`;
  message += `${summary}\n`;

  // Action items (only if there are any)
  if (actionItems.length > 0) {
    message += `\n*Action Items*\n`;
    actionItems.forEach((item, index) => {
      const owner = item.owner && item.owner !== "Unassigned" ? item.owner : "TBD";
      message += `${index + 1}. ${owner} - ${item.task}\n`;
    });
  }

  message += `\n_Sent by AYA_`;

  return message;
}
