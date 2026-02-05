/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

/**
 * Inngest function to create bidirectional contacts in the background
 * Triggered by event: contact/create.bidirectional
 */
export const createBidirectionalContact = inngest.createFunction(
  { id: "create-bidirectional-contact" },
  { event: "contact/create.bidirectional" },
  async ({ event, step }) => {
    const { contactId, contactEmail, userId, teamId } = event.data;

    await step.run("create-reverse-contact", async () => {
      if (!contactEmail) return { skipped: true, reason: "No email provided" };

      const contactEmailLower = contactEmail.toLowerCase();

      // Check if this email belongs to an existing user
      const existingUser = await prisma.user.findUnique({
        where: { email: contactEmailLower },
        select: { id: true, email: true, name: true, teamId: true },
      });

      if (!existingUser || !existingUser.teamId) {
        return { skipped: true, reason: "User not found or no team" };
      }

      // Get current user info
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!currentUser || !currentUser.email) {
        return { skipped: true, reason: "Current user not found" };
      }

      // Check if reverse contact already exists
      const existingReverseContact = await prisma.contact.findFirst({
        where: {
          email: currentUser.email.toLowerCase(),
          teamId: existingUser.teamId,
        },
      });

      if (existingReverseContact) {
        return { skipped: true, reason: "Reverse contact already exists" };
      }

      // Create reverse contact
      const reverseContact = await prisma.contact.create({
        data: {
          email: currentUser.email.toLowerCase(),
          name: currentUser.name || currentUser.email.split("@")[0] || "Unknown",
          teamId: existingUser.teamId,
          tags: ["auto-created"],
          customFields: {
            autoCreated: true,
            createdBy: userId,
            originalContactId: contactId,
            createdAt: new Date().toISOString(),
          },
        },
      });

      return { success: true, reverseContactId: reverseContact.id };
    });

    return { success: true };
  }
);
