# Vendor Contact → Inbox Contact Sync

## Problem
When a vendor emails us, their messages don't appear in the unified inbox because `VendorContact` and `Contact` are separate models with no link. The inbox only shows emails from senders in the `Contact` table.

## Solution
Auto-create (or update) a `Contact` record whenever a `VendorContact` is created. Make email required when adding vendor contacts.

## Logic
1. After `VendorContact` creation, check if a `Contact` with the same email exists for the team
2. **Exists** → add `"vendor"` and `"auto-created"` tags, set `customFields.vendorId` and `customFields.vendorContactId`
3. **Not exists** → create `Contact` with name, email, phone, teamId, tags `["vendor", "auto-created"]`, and vendor metadata in `customFields`

## Hook Points
1. `POST /api/vendors/[id]/contacts` — individual vendor contact creation
2. `POST /api/vendors` — vendor creation with nested contacts

## Shared Helper
`lib/vendors/sync-vendor-contact.ts` — called from both routes.

## Validation Change
Make `email` required (not optional) on vendor contact creation schemas in both routes.

## Tags
- `vendor` — identifies contact as a vendor representative
- `auto-created` — identifies contact was auto-synced, not manually created
