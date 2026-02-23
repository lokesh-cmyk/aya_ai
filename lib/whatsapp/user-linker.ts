import { prisma } from "@/lib/prisma";

export type LinkResult =
  | { status: "linked"; userId: string; userName: string | null }
  | { status: "awaiting_email"; message: string }
  | { status: "not_found"; message: string }
  | { status: "email_linked"; userId: string; userName: string | null };

/**
 * Look up a user by their WhatsApp phone number.
 * Returns the user if found, or null if unknown.
 */
export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { whatsappPhone: phone },
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      timezone: true,
      whatsappDigestEnabled: true,
      whatsappMeetingSummaryEnabled: true,
    },
  });
}

/**
 * Attempt to link a phone number to a user via email.
 * Returns the link result.
 */
export async function linkPhoneByEmail(
  phone: string,
  email: string
): Promise<LinkResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, whatsappPhone: true },
  });

  if (!user) {
    return {
      status: "not_found",
      message:
        "I couldn't find an account with that email. Please sign up first and then message me again!",
    };
  }

  if (user.whatsappPhone && user.whatsappPhone !== phone) {
    return {
      status: "not_found",
      message:
        "That account is already linked to a different WhatsApp number. Please contact support if you need to change it.",
    };
  }

  // Link the phone number
  await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsappPhone: phone,
      whatsappLinkedAt: new Date(),
      whatsappDigestEnabled: true,
    },
  });

  return {
    status: "email_linked",
    userId: user.id,
    userName: user.name,
  };
}

/**
 * Check if a conversation is in linking flow (awaiting email)
 */
export function isInLinkingFlow(metadata: any): boolean {
  return metadata?.linkingFlow === true && metadata?.awaitingEmail === true;
}

/**
 * Extract email from a message (simple regex)
 */
export function extractEmail(message: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = message.match(emailRegex);
  return match ? match[0].toLowerCase() : null;
}
