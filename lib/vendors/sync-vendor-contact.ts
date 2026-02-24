// lib/vendors/sync-vendor-contact.ts

import { prisma } from "@/lib/prisma";

interface SyncVendorContactParams {
  name: string;
  email: string;
  phone?: string | null;
  vendorId: string;
  vendorContactId: string;
  teamId: string;
}

/**
 * Ensures a Contact record exists for a VendorContact so their emails
 * appear in the unified inbox. If a Contact with the same email already
 * exists for the team, it gets tagged with vendor metadata.
 */
export async function syncVendorContact({
  name,
  email,
  phone,
  vendorId,
  vendorContactId,
  teamId,
}: SyncVendorContactParams) {
  const normalizedEmail = email.toLowerCase();

  // Check if a Contact with this email already exists for the team
  const existing = await prisma.contact.findFirst({
    where: {
      email: normalizedEmail,
      teamId,
    },
  });

  if (existing) {
    // Update existing contact with vendor tags
    const currentTags = existing.tags || [];
    const newTags = Array.from(
      new Set([...currentTags, "vendor", "auto-created"])
    );

    const currentCustomFields =
      (existing.customFields as Record<string, unknown>) || {};

    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        tags: newTags,
        customFields: {
          ...currentCustomFields,
          vendorId,
          vendorContactId,
          autoCreated: true,
        },
      },
    });

    return existing.id;
  }

  // Create a new Contact
  const contact = await prisma.contact.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      teamId,
      tags: ["vendor", "auto-created"],
      customFields: {
        vendorId,
        vendorContactId,
        autoCreated: true,
      },
    },
  });

  return contact.id;
}
