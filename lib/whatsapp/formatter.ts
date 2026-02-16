/**
 * Format AI responses for WhatsApp
 *
 * Converts standard markdown to WhatsApp-compatible formatting and
 * splits long messages into multiple chunks.
 */

const MAX_MESSAGE_LENGTH = 4000; // WhatsApp limit is ~65k, but readability drops after this

/**
 * Convert markdown to WhatsApp-compatible formatting
 */
export function formatForWhatsApp(text: string): string {
  let formatted = text;

  // Remove component blocks (:::component{type="..."} ... :::) — not supported on WhatsApp
  formatted = formatted.replace(
    /:::component\{type="[^"]*"\}\n[\s\S]*?\n:::/g,
    ""
  );

  // Remove [CONNECT_ACTION:...] markers
  formatted = formatted.replace(/\[CONNECT_ACTION:[^\]]+\]/g, "");

  // Convert ## headers to *bold* with line breaks
  formatted = formatted.replace(/^###?\s+(.+)$/gm, "\n*$1*\n");
  formatted = formatted.replace(/^#\s+(.+)$/gm, "\n*$1*\n");

  // Convert markdown bold **text** to WhatsApp bold *text*
  // (careful not to double-convert already single-star text)
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Convert markdown italic (underscore) — WhatsApp uses same syntax
  // __text__ → _text_
  formatted = formatted.replace(/__(.+?)__/g, "_$1_");

  // Convert markdown tables to lists
  formatted = convertTablesToLists(formatted);

  // Clean up excessive newlines
  formatted = formatted.replace(/\n{4,}/g, "\n\n\n");

  return formatted.trim();
}

/**
 * Convert markdown tables to numbered lists
 */
function convertTablesToLists(text: string): string {
  const tableRegex = /\|(.+)\|\n\|[-|\s]+\|\n((?:\|.+\|\n?)+)/g;

  return text.replace(tableRegex, (_match, headerRow, bodyRows) => {
    const headers = headerRow
      .split("|")
      .map((h: string) => h.trim())
      .filter(Boolean);

    const rows = bodyRows
      .trim()
      .split("\n")
      .map((row: string) =>
        row
          .split("|")
          .map((c: string) => c.trim())
          .filter(Boolean)
      );

    let result = "";
    rows.forEach((row: string[], i: number) => {
      result += `${i + 1}. `;
      row.forEach((cell: string, j: number) => {
        if (headers[j]) {
          result += `*${headers[j]}:* ${cell}  `;
        }
      });
      result += "\n";
    });

    return result;
  });
}

/**
 * Split a long message into multiple WhatsApp-friendly chunks
 * Splits at paragraph boundaries to maintain readability
 */
export function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > MAX_MESSAGE_LENGTH) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      // If single paragraph exceeds limit, split by sentences
      if (paragraph.length > MAX_MESSAGE_LENGTH) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (current.length + sentence.length > MAX_MESSAGE_LENGTH) {
            if (current) chunks.push(current.trim());
            current = sentence;
          } else {
            current += sentence;
          }
        }
      } else {
        current = paragraph;
      }
    } else {
      current += (current ? "\n\n" : "") + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
