# Vendor Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Vendor Tracker module in AYA AI for managing vendor relationships, SLAs, change requests with AI impact analysis, risk heatmaps, and playbook-driven mitigation.

**Architecture:** Standalone module following the same pattern as Command Center and Meetings -- new Prisma models, API routes under `/app/api/vendors/`, UI pages under `/app/(app)/vendors/`, Inngest background jobs for monitoring, and Command Center integration for signals.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 (PostgreSQL), shadcn/ui + Tailwind CSS, React Query 5, Inngest 3, Anthropic Claude (AI SDK), Zod validation.

---

## Task 1: Database Schema — Enums & Vendor Model

**Files:**
- Modify: `prisma/schema.prisma` (append after line 879, before end of file)

**Step 1: Add vendor enums to Prisma schema**

Append after the `Feedback` model (end of `schema.prisma`):

```prisma
// ============================================
// Vendor Tracker Models
// ============================================

enum VendorStatus {
  ONBOARDING
  ACTIVE
  INACTIVE
  OFFBOARDING
}

enum RenewalType {
  AUTO
  MANUAL
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum SLAStatus {
  MET
  AT_RISK
  BREACHED
}

enum ChangeRequestStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  IMPLEMENTED
}

enum ChangeRequestPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum RiskCategory {
  SLA_BREACH
  CONTRACT
  DELIVERY
  FINANCIAL
  OPERATIONAL
  SECURITY
}

enum RiskStatus {
  OPEN
  MITIGATING
  RESOLVED
  ACCEPTED
}
```

**Step 2: Add Vendor model**

```prisma
model Vendor {
  id              String        @id @default(cuid())
  name            String
  category        String        // e.g., "SaaS", "Consulting", "Infrastructure"
  status          VendorStatus  @default(ONBOARDING)
  website         String?
  description     String?
  contractStart   DateTime?
  contractEnd     DateTime?
  renewalDate     DateTime?
  renewalType     RenewalType   @default(MANUAL)
  billingCycle    BillingCycle  @default(MONTHLY)
  contractValue   Float?
  tags            String[]
  customFields    Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  teamId          String
  team            Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdById     String
  createdBy       User          @relation("VendorCreator", fields: [createdById], references: [id])

  contacts        VendorContact[]
  slas            SLA[]
  changeRequests  ChangeRequest[]
  risks           Risk[]

  @@index([teamId])
  @@index([status])
  @@index([renewalDate])
  @@index([createdById])
}
```

**Step 3: Add VendorContact model**

```prisma
model VendorContact {
  id          String    @id @default(cuid())
  name        String
  email       String?
  phone       String?
  role        String?
  isPrimary   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  vendorId    String
  vendor      Vendor    @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@index([vendorId])
  @@index([email])
}
```

**Step 4: Add SLA model**

```prisma
model SLA {
  id              String      @id @default(cuid())
  name            String
  description     String?
  metric          String      // e.g., "uptime_percent", "response_time_hours"
  target          String      // e.g., "99.9%", "< 4 hours"
  currentValue    String?
  status          SLAStatus   @default(MET)
  lastMeasuredAt  DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  vendorId        String
  vendor          Vendor      @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@index([vendorId])
  @@index([status])
}
```

**Step 5: Add ChangeRequest model**

```prisma
model ChangeRequest {
  id               String                @id @default(cuid())
  title            String
  description      String?
  requestedBy      String?               // Vendor contact name
  status           ChangeRequestStatus   @default(DRAFT)
  priority         ChangeRequestPriority @default(NORMAL)
  originalPlan     Json?                 // What was originally agreed
  requestedChange  Json?                 // What vendor wants to change
  impactAnalysis   Json?                 // AI-prefilled: { cost, timeline, scope, risk }
  approvedAt       DateTime?
  rejectedReason   String?
  sourceMessageId  String?               // If AI-extracted from inbox
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  vendorId         String
  vendor           Vendor                @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  createdById      String
  createdBy        User                  @relation("ChangeRequestCreator", fields: [createdById], references: [id])
  approvedById     String?
  approvedBy       User?                 @relation("ChangeRequestApprover", fields: [approvedById], references: [id])

  risks            Risk[]

  @@index([vendorId])
  @@index([status])
  @@index([createdById])
  @@index([priority])
}
```

**Step 6: Add Risk model**

```prisma
model Risk {
  id              String        @id @default(cuid())
  title           String
  description     String?
  probability     Int           // 1-5
  impact          Int           // 1-5
  riskScore       Int           // probability * impact (computed on write)
  category        RiskCategory
  status          RiskStatus    @default(OPEN)
  mitigationPlan  String?
  aiSuggestions   Json?         // AI-generated mitigation suggestions
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  vendorId        String?
  vendor          Vendor?       @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  changeRequestId String?
  changeRequest   ChangeRequest? @relation(fields: [changeRequestId], references: [id], onDelete: SetNull)
  createdById     String
  createdBy       User          @relation("RiskCreator", fields: [createdById], references: [id])

  @@index([vendorId])
  @@index([changeRequestId])
  @@index([category])
  @@index([status])
  @@index([riskScore])
  @@index([createdById])
}
```

**Step 7: Add Playbook model**

```prisma
model Playbook {
  id                String        @id @default(cuid())
  name              String
  description       String?
  category          RiskCategory
  triggerCondition   String?       // e.g., "SLA breach > 3 days"
  steps             Json          // Array of { title, description, order }
  isSystemProvided  Boolean       @default(false)
  isActive          Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  teamId            String
  team              Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([category])
  @@index([isActive])
}
```

**Step 8: Add reverse relations to User and Team models**

Add to the `User` model (after the `feedbacks` relation, before `@@index`):

```prisma
  // Vendor relations
  createdVendors      Vendor[]         @relation("VendorCreator")
  createdChangeRequests ChangeRequest[] @relation("ChangeRequestCreator")
  approvedChangeRequests ChangeRequest[] @relation("ChangeRequestApprover")
  createdRisks        Risk[]           @relation("RiskCreator")
```

Add to the `Team` model (after `meetings` relation):

```prisma
  vendors   Vendor[]
  playbooks Playbook[]
```

**Step 9: Generate Prisma client and create migration**

Run:
```bash
npx prisma generate
npx prisma migrate dev --name add-vendor-tracker-models
```

**Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ app/generated/prisma/
git commit -m "feat(vendor-tracker): add database schema - enums, models, relations"
```

---

## Task 2: Vendor API — CRUD Routes

**Files:**
- Create: `app/api/vendors/route.ts`
- Create: `app/api/vendors/[id]/route.ts`

**Step 1: Create vendor list + create route**

Create `app/api/vendors/route.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'INACTIVE', 'OFFBOARDING']).optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  renewalDate: z.string().optional(),
  renewalType: z.enum(['AUTO', 'MANUAL']).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  contractValue: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  contacts: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  slas: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    metric: z.string().min(1),
    target: z.string().min(1),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({ vendors: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { teamId: user.teamId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (category) where.category = category;

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          slas: { select: { id: true, status: true } },
          _count: { select: { changeRequests: true, risks: true, contacts: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.vendor.count({ where }),
    ]);

    return NextResponse.json({
      vendors,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true, name: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    // VIEWER cannot create
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { contacts, slas, ...vendorData } = createVendorSchema.parse(body);

    const vendor = await prisma.vendor.create({
      data: {
        ...vendorData,
        website: vendorData.website || null,
        contractStart: vendorData.contractStart ? new Date(vendorData.contractStart) : null,
        contractEnd: vendorData.contractEnd ? new Date(vendorData.contractEnd) : null,
        renewalDate: vendorData.renewalDate ? new Date(vendorData.renewalDate) : null,
        teamId: user.teamId,
        createdById: session.user.id,
        contacts: contacts?.length ? {
          create: contacts.map((c) => ({
            name: c.name,
            email: c.email || null,
            phone: c.phone || null,
            role: c.role || null,
            isPrimary: c.isPrimary || false,
          })),
        } : undefined,
        slas: slas?.length ? {
          create: slas.map((s) => ({
            name: s.name,
            description: s.description || null,
            metric: s.metric,
            target: s.target,
          })),
        } : undefined,
      },
      include: {
        contacts: true,
        slas: true,
      },
    });

    // Notify team
    try {
      const { createTeamNotification } = await import('@/lib/notifications');
      await createTeamNotification(user.teamId, {
        title: 'New vendor onboarded',
        message: `${user.name || 'A team member'} added vendor "${vendor.name}"`,
        type: 'info',
        link: `/vendors/${vendor.id}`,
        metadata: { vendorId: vendor.id },
      }, session.user.id);
    } catch (err) {
      console.error('Notification error:', err);
    }

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
```

**Step 2: Create vendor detail route**

Create `app/api/vendors/[id]/route.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'INACTIVE', 'OFFBOARDING']).optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  renewalDate: z.string().optional(),
  renewalType: z.enum(['AUTO', 'MANUAL']).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  contractValue: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
}).partial();

async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = getSessionCookie(cookieStore);
  if (!sessionCookie) return null;

  const { auth } = await import('@/lib/auth');
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true, role: true, name: true },
  });

  return { session, user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        slas: { orderBy: { status: 'asc' } },
        changeRequests: { orderBy: { createdAt: 'desc' }, take: 10, include: { createdBy: { select: { id: true, name: true } } } },
        risks: { orderBy: { riskScore: 'desc' }, take: 10, include: { createdBy: { select: { id: true, name: true } } } },
        createdBy: { select: { id: true, name: true, image: true } },
        _count: { select: { changeRequests: true, risks: true, contacts: true, slas: true } },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (vendor.teamId !== authResult.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authResult.user?.role === 'VIEWER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existing = await prisma.vendor.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing || existing.teamId !== authResult.user?.teamId) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateVendorSchema.parse(body);

    const updateData: any = { ...validated };
    if (validated.contractStart) updateData.contractStart = new Date(validated.contractStart);
    if (validated.contractEnd) updateData.contractEnd = new Date(validated.contractEnd);
    if (validated.renewalDate) updateData.renewalDate = new Date(validated.renewalDate);
    if (validated.website === '') updateData.website = null;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        slas: true,
        _count: { select: { changeRequests: true, risks: true } },
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Update vendor error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authResult.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete vendors' }, { status: 403 });
    }

    const existing = await prisma.vendor.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing || existing.teamId !== authResult.user?.teamId) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete vendor error:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/vendors/
git commit -m "feat(vendor-tracker): add vendor CRUD API routes"
```

---

## Task 3: Vendor Contacts & SLA API Routes

**Files:**
- Create: `app/api/vendors/[id]/contacts/route.ts`
- Create: `app/api/vendors/[id]/slas/route.ts`

**Step 1: Create vendor contacts route** at `app/api/vendors/[id]/contacts/route.ts`

Follow the same auth pattern from Task 2. Support GET (list contacts for vendor) and POST (add contact to vendor). Include Zod validation for `{ name, email?, phone?, role?, isPrimary? }`.

**Step 2: Create vendor SLAs route** at `app/api/vendors/[id]/slas/route.ts`

Support GET (list SLAs for vendor) and POST (add SLA). PATCH for updating SLA `currentValue` and `status`. Zod schema: `{ name, description?, metric, target, currentValue?, status? }`.

**Step 3: Commit**

```bash
git add app/api/vendors/
git commit -m "feat(vendor-tracker): add vendor contacts and SLA API routes"
```

---

## Task 4: Change Request API Routes

**Files:**
- Create: `app/api/change-requests/route.ts`
- Create: `app/api/change-requests/[id]/route.ts`
- Create: `app/api/change-requests/[id]/approve/route.ts`

**Step 1: Create change request list + create route** at `app/api/change-requests/route.ts`

GET: List all change requests for team. Supports filters: `vendorId`, `status`, `priority`. Includes vendor name and creator info.
POST: Create new change request. Validates with Zod. After creation, triggers AI impact analysis via Inngest event `vendor/change-request.analyze`.

**Step 2: Create change request detail route** at `app/api/change-requests/[id]/route.ts`

GET: Full detail with vendor, creator, approver info.
PATCH: Update fields (title, description, requestedChange, impactAnalysis, priority, status). EDITOR can update DRAFT/SUBMITTED. ADMIN can update any status.

**Step 3: Create approval route** at `app/api/change-requests/[id]/approve/route.ts`

POST: Body `{ action: 'approve' | 'reject', reason?: string }`. Only ADMIN can call. Sets `approvedById`, `approvedAt`, and status. On approval, optionally auto-creates risks from impact analysis. Sends notifications to team.

**Step 4: Commit**

```bash
git add app/api/change-requests/
git commit -m "feat(vendor-tracker): add change request API with approval workflow"
```

---

## Task 5: Risk & Playbook API Routes

**Files:**
- Create: `app/api/risks/route.ts`
- Create: `app/api/risks/[id]/route.ts`
- Create: `app/api/playbooks/route.ts`
- Create: `app/api/playbooks/[id]/route.ts`

**Step 1: Create risk CRUD routes**

`app/api/risks/route.ts` — GET (list, filterable by vendorId/category/status), POST (create, computes `riskScore = probability * impact`, triggers AI mitigation via Inngest).
`app/api/risks/[id]/route.ts` — GET, PATCH (update status/mitigation/probability/impact), DELETE (ADMIN only).

**Step 2: Create playbook CRUD routes**

`app/api/playbooks/route.ts` — GET (list for team, includes system-provided), POST (create custom playbook, ADMIN only).
`app/api/playbooks/[id]/route.ts` — GET, PATCH (toggle `isActive`, update steps), DELETE (only non-system playbooks, ADMIN only).

**Step 3: Commit**

```bash
git add app/api/risks/ app/api/playbooks/
git commit -m "feat(vendor-tracker): add risk and playbook API routes"
```

---

## Task 6: Vendor Dashboard Stats API

**Files:**
- Create: `app/api/vendors/stats/route.ts`

**Step 1: Create stats endpoint**

Returns aggregated data for the vendor dashboard:
```typescript
{
  totalVendors: number,
  activeVendors: number,
  totalSLAs: number,
  slaBreaches: number, // SLAs with BREACHED status
  openChangeRequests: number,
  highRisks: number, // riskScore >= 16
  upcomingRenewals: Vendor[], // renewalDate within 30 days
  recentChangeRequests: ChangeRequest[], // last 5
  recentRisks: Risk[], // last 5
}
```

**Step 2: Commit**

```bash
git add app/api/vendors/stats/
git commit -m "feat(vendor-tracker): add vendor dashboard stats API"
```

---

## Task 7: Sidebar Navigation Update

**Files:**
- Modify: `components/layout/AppSidebar.tsx`

**Step 1: Add Building2 import and Vendors nav item**

In `components/layout/AppSidebar.tsx`, add `Building2` to the lucide-react import (it's already imported but used for Organization settings — use `Store` or `Handshake` instead to avoid collision). Actually, `Building2` is already imported. Use `Handshake` for vendors.

Add to the `navigation` array after the CRM entry (after line 34):

```typescript
  { name: "Vendors", href: "/vendors", icon: Handshake },
```

Add `Handshake` to the lucide-react import on line 6-22.

**Step 2: Commit**

```bash
git add components/layout/AppSidebar.tsx
git commit -m "feat(vendor-tracker): add Vendors to sidebar navigation"
```

---

## Task 8: Vendor Dashboard Page

**Files:**
- Create: `app/(app)/vendors/page.tsx`

**Step 1: Create the vendor dashboard page**

`"use client"` page with React Query fetching `/api/vendors/stats`. Display:
- 4 summary cards (Total Vendors, SLA Breaches, Open Change Requests, High Risks) using `Card` from shadcn
- Upcoming renewals list (next 30 days) with countdown badges
- Recent change requests list
- Recent risks list
- Links to sub-pages: `/vendors/list`, `/vendors/change-requests`, `/vendors/risks`, `/vendors/playbooks`

Follow the same layout pattern as the existing dashboard page. Use `Handshake`, `AlertTriangle`, `FileText`, `Shield` icons from lucide.

**Step 2: Commit**

```bash
git add app/(app)/vendors/
git commit -m "feat(vendor-tracker): add vendor dashboard page"
```

---

## Task 9: Vendor List Page

**Files:**
- Create: `app/(app)/vendors/list/page.tsx`
- Create: `components/vendors/VendorCard.tsx`
- Create: `components/vendors/CreateVendorDialog.tsx`
- Create: `components/vendors/VendorStatusBadge.tsx`

**Step 1: Create VendorStatusBadge component**

Simple badge component mapping VendorStatus to colors:
- ONBOARDING → blue
- ACTIVE → green
- INACTIVE → gray
- OFFBOARDING → amber

Uses `Badge` from shadcn/ui.

**Step 2: Create VendorCard component**

Card showing: vendor name, category, status badge, contract end date, SLA health summary (X met / Y breached), change request count. Click navigates to `/vendors/[id]`.

**Step 3: Create CreateVendorDialog component**

Multi-step dialog (3 steps):
1. Basic info (name, category, website, description)
2. Contacts (add 1+ contacts with name, email, phone, role, isPrimary)
3. Contract details (contractStart, contractEnd, renewalDate, renewalType, billingCycle, contractValue) + SLA definitions

Uses `Dialog` from shadcn, form state with `useState`, submits to `POST /api/vendors`.

**Step 4: Create vendor list page**

Search bar, status filter dropdown, category filter. Grid of VendorCards. "Add Vendor" button opens CreateVendorDialog. Empty state with CTA.

**Step 5: Commit**

```bash
git add app/(app)/vendors/list/ components/vendors/
git commit -m "feat(vendor-tracker): add vendor list page with card view and create dialog"
```

---

## Task 10: Vendor Detail Page (Tabbed)

**Files:**
- Create: `app/(app)/vendors/[id]/page.tsx`
- Create: `components/vendors/VendorDetailView.tsx`
- Create: `components/vendors/VendorSLAList.tsx`
- Create: `components/vendors/VendorChangeRequests.tsx`
- Create: `components/vendors/VendorRisks.tsx`

**Step 1: Create VendorDetailView component**

Tabbed view using shadcn `Tabs` component. Tabs:
- **Overview**: Vendor info card, contract details, key contacts list, renewal countdown (days until renewal with color coding)
- **SLAs**: VendorSLAList component (table of SLA metrics with status badges, add SLA button)
- **Change Requests**: VendorChangeRequests component (filtered list, create button)
- **Risks**: VendorRisks component (filtered risk list, create button)

**Step 2: Create VendorSLAList component**

Table with columns: Name, Metric, Target, Current Value, Status badge, Last Measured. Inline edit for currentValue. Add SLA dialog.

**Step 3: Create VendorChangeRequests component**

List of change requests for this vendor. Status badges, priority badges. Click opens change request detail. "New Change Request" button.

**Step 4: Create VendorRisks component**

List of risks for this vendor. Probability/Impact displayed, risk score badge (color coded: green <8, yellow 8-15, red >=16). Mitigation plan preview.

**Step 5: Create vendor detail page**

Fetches vendor by ID via React Query. Renders VendorDetailView. Back button to vendor list.

**Step 6: Commit**

```bash
git add app/(app)/vendors/[id]/ components/vendors/
git commit -m "feat(vendor-tracker): add vendor detail page with tabbed view"
```

---

## Task 11: Change Request Center (Kanban)

**Files:**
- Create: `app/(app)/vendors/change-requests/page.tsx`
- Create: `components/vendors/ChangeRequestKanban.tsx`
- Create: `components/vendors/ChangeRequestCard.tsx`
- Create: `components/vendors/ChangeRequestDetail.tsx`
- Create: `components/vendors/CreateChangeRequestDialog.tsx`

**Step 1: Create ChangeRequestCard component**

Card for Kanban board showing: title, vendor name, priority badge, impact summary snippet, creator, date. Click opens detail.

**Step 2: Create ChangeRequestDetail component**

Full detail view in a dialog/panel:
- Side-by-side comparison: Original Plan vs. Requested Change (rendered from JSON)
- AI Impact Analysis section (editable): cost, timeline, scope, risk assessment
- Status badge, priority dropdown
- Approval section (ADMIN only): Approve/Reject buttons, rejection reason input
- Activity timeline

**Step 3: Create CreateChangeRequestDialog component**

Form: select vendor, title, description, requestedBy (from vendor contacts), priority, describe the requested change (rich text/structured fields). On submit, POSTs to `/api/change-requests` which triggers AI analysis.

**Step 4: Create ChangeRequestKanban component**

Columns: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED. Each column renders ChangeRequestCards. Simple layout (no drag-and-drop needed for v1 — status changes via the detail view).

**Step 5: Create change request center page**

Fetches all change requests. Filters: vendor, priority. "New Change Request" button. Renders ChangeRequestKanban. Opens ChangeRequestDetail on card click.

**Step 6: Commit**

```bash
git add app/(app)/vendors/change-requests/ components/vendors/
git commit -m "feat(vendor-tracker): add change request center with kanban layout"
```

---

## Task 12: Risk Heatmap Page

**Files:**
- Create: `app/(app)/vendors/risks/page.tsx`
- Create: `components/vendors/RiskHeatmap.tsx`
- Create: `components/vendors/RiskDetailPanel.tsx`
- Create: `components/vendors/CreateRiskDialog.tsx`

**Step 1: Create RiskHeatmap component**

5x5 grid (probability on Y-axis 1-5, impact on X-axis 1-5). Each cell shows:
- Color intensity based on risk score (green → yellow → orange → red)
- Count of risks in that cell
- Click a cell to filter the risk list below

Axis labels: Probability (Rare, Unlikely, Possible, Likely, Almost Certain), Impact (Negligible, Minor, Moderate, Major, Catastrophic).

**Step 2: Create RiskDetailPanel component**

Slide-out panel showing:
- Risk title, description, category badge
- Probability/Impact selector (1-5 dropdowns)
- Status dropdown (OPEN → MITIGATING → RESOLVED/ACCEPTED)
- Vendor link (if attached)
- Mitigation Plan (editable text area)
- AI Suggestions section (rendered from `aiSuggestions` JSON)
- Applicable Playbooks (list of active playbooks matching this risk's category)

**Step 3: Create CreateRiskDialog component**

Form: title, description, category dropdown, probability (1-5), impact (1-5), vendor (optional dropdown), mitigation plan. Submits to `POST /api/risks`.

**Step 4: Create risk heatmap page**

Fetches all risks. Filters: vendor, category, status. Portfolio summary cards (total risks, critical count, mitigating count). RiskHeatmap component. Below heatmap: filtered risk list. Side panel opens on risk click. "Add Risk" button.

**Step 5: Commit**

```bash
git add app/(app)/vendors/risks/ components/vendors/
git commit -m "feat(vendor-tracker): add risk heatmap page with detail panel"
```

---

## Task 13: Playbook Library Page

**Files:**
- Create: `app/(app)/vendors/playbooks/page.tsx`
- Create: `components/vendors/PlaybookCard.tsx`
- Create: `components/vendors/PlaybookDetailDialog.tsx`
- Create: `components/vendors/CreatePlaybookDialog.tsx`

**Step 1: Create PlaybookCard component**

Card showing: name, description preview, category badge, "System" or "Custom" badge, active/inactive toggle. Click opens detail.

**Step 2: Create PlaybookDetailDialog component**

Full playbook view: name, description, category, trigger condition, ordered list of steps (title + description). Edit button for custom playbooks.

**Step 3: Create CreatePlaybookDialog component**

Form: name, description, category, trigger condition, dynamic steps list (add/remove/reorder steps, each with title + description). ADMIN only.

**Step 4: Create playbook library page**

Fetches playbooks. Filter: category, system vs custom. Grid of PlaybookCards. Toggle switches call `PATCH /api/playbooks/[id]` to toggle `isActive`. "Create Playbook" button (ADMIN only).

**Step 5: Commit**

```bash
git add app/(app)/vendors/playbooks/ components/vendors/
git commit -m "feat(vendor-tracker): add playbook library page"
```

---

## Task 14: Seed Default Playbooks

**Files:**
- Create: `lib/vendors/seed-playbooks.ts`
- Create: `app/api/vendors/seed-playbooks/route.ts`

**Step 1: Create playbook seed data**

Define 8 system-provided playbooks with full step data:
1. SLA Breach Response (SLA_BREACH)
2. Contract Renewal Prep (CONTRACT)
3. Vendor Offboarding (OPERATIONAL)
4. Security Incident Response (SECURITY)
5. Cost Overrun Management (FINANCIAL)
6. Delivery Delay Mitigation (DELIVERY)
7. Compliance Gap Remediation (SECURITY)
8. Emergency Vendor Replacement (OPERATIONAL)

Each with 4-6 actionable steps.

**Step 2: Create seed API route**

POST endpoint that creates system-provided playbooks for a team if they don't exist yet. Called during vendor module first use or from settings.

**Step 3: Commit**

```bash
git add lib/vendors/ app/api/vendors/seed-playbooks/
git commit -m "feat(vendor-tracker): add default playbook seed data"
```

---

## Task 15: AI Impact Analysis (Inngest + Claude)

**Files:**
- Create: `lib/inngest/functions/vendor-change-analysis.ts`
- Create: `lib/vendors/ai-analysis.ts`
- Modify: `app/api/inngest/route.ts` (register new function)

**Step 1: Create AI analysis utility**

`lib/vendors/ai-analysis.ts` — Function `generateImpactAnalysis` that calls Claude via the existing `@ai-sdk/anthropic` package:
- Input: vendor info, SLA data, original plan, requested change
- Prompt: "Analyze this vendor change request and provide impact analysis..."
- Output: `{ cost: string, timeline: string, scope: string, riskAssessment: string }`
- Returns structured JSON

Also: `generateMitigationSuggestions` — Takes risk context, vendor history, active playbooks → returns mitigation suggestions.

**Step 2: Create Inngest function**

`lib/inngest/functions/vendor-change-analysis.ts`:
- Event: `vendor/change-request.analyze`
- Steps: (1) Fetch change request + vendor + SLA data, (2) Call `generateImpactAnalysis`, (3) Update change request with `impactAnalysis`, (4) Create notification.

**Step 3: Create risk mitigation Inngest function**

Add to the same file or new `vendor-risk-mitigation.ts`:
- Event: `vendor/risk.generate-mitigations`
- Steps: (1) Fetch risk + vendor + playbooks, (2) Call `generateMitigationSuggestions`, (3) Update risk with `aiSuggestions`, (4) Notify.

**Step 4: Register in Inngest route**

Add imports and register both functions in `app/api/inngest/route.ts`.

**Step 5: Commit**

```bash
git add lib/inngest/functions/vendor-change-analysis.ts lib/vendors/ai-analysis.ts app/api/inngest/route.ts
git commit -m "feat(vendor-tracker): add AI impact analysis and mitigation suggestions via Inngest"
```

---

## Task 16: AI Change Detection from Inbox (Inngest)

**Files:**
- Create: `lib/inngest/functions/vendor-inbox-detection.ts`
- Create: `lib/vendors/ai-detection.ts`
- Modify: `app/api/inngest/route.ts` (register)

**Step 1: Create detection utility**

`lib/vendors/ai-detection.ts` — Function `detectChangeRequestFromMessage`:
- Input: message content, vendor info, SLA data
- Claude prompt: "Analyze this message from a vendor contact. Determine if it contains a change request, SLA concern, or renewal discussion..."
- Output: `{ isChangeRequest: boolean, confidence: number, extractedTitle?: string, extractedChange?: object }`

**Step 2: Create Inngest function**

Event: `vendor/inbox.detect-change`
Triggered when a message arrives from a known VendorContact (match by email/phone).
Steps:
1. Fetch message content
2. Match sender to VendorContact
3. Call `detectChangeRequestFromMessage`
4. If confidence > 0.7 and isChangeRequest, create ChangeRequest in DRAFT
5. Notify team member

**Step 3: Add message webhook trigger**

In the existing message/webhook processing pipeline, after a message is saved, check if sender matches any VendorContact. If so, send Inngest event `vendor/inbox.detect-change`.

**Step 4: Register in Inngest route**

**Step 5: Commit**

```bash
git add lib/inngest/functions/vendor-inbox-detection.ts lib/vendors/ai-detection.ts app/api/inngest/route.ts
git commit -m "feat(vendor-tracker): add AI-powered change detection from inbox messages"
```

---

## Task 17: SLA & Renewal Monitoring (Inngest Cron)

**Files:**
- Create: `lib/inngest/functions/vendor-monitoring.ts`
- Modify: `app/api/inngest/route.ts` (register)

**Step 1: Create daily monitoring function**

`lib/inngest/functions/vendor-monitoring.ts`:

Two functions:
1. `vendorRenewalCheck` — Cron: `0 9 * * *` (daily at 9am)
   - Find vendors with renewalDate within 30/14/7 days
   - Create notifications at each threshold
   - For 7-day threshold: create WARNING notification

2. `vendorSLACheck` — Cron: `0 */6 * * *` (every 6 hours)
   - Find SLAs with BREACHED status
   - For new breaches: auto-create Risk (category: SLA_BREACH), notify ADMIN
   - Update SLA status based on currentValue vs target

**Step 2: Register in Inngest route**

**Step 3: Commit**

```bash
git add lib/inngest/functions/vendor-monitoring.ts app/api/inngest/route.ts
git commit -m "feat(vendor-tracker): add Inngest cron jobs for SLA and renewal monitoring"
```

---

## Task 18: Command Center Integration

**Files:**
- Modify: `lib/command-center/types.ts`
- Modify: `lib/command-center/signals.ts`
- Modify: `app/api/command-center/signals/route.ts`

**Step 1: Add vendor signal types**

In `lib/command-center/types.ts`, add to `SignalType`:
```typescript
  | "sla_breach"
  | "renewal_due"
  | "change_request_pending"
  | "high_risk"
```

Add `"vendor"` to `entityType` union.

Add thresholds:
```typescript
export const RENEWAL_WARNING_DAYS = 14;
export const CHANGE_REQUEST_STALE_DAYS = 2;
export const HIGH_RISK_THRESHOLD = 16;
```

**Step 2: Add vendor signal detection functions**

In `lib/command-center/signals.ts`, add 4 functions:
- `detectSLABreachSignals(teamId)` — Find SLAs with BREACHED status
- `detectRenewalDueSignals(teamId)` — Vendors with renewalDate within 14 days
- `detectPendingChangeRequestSignals(teamId)` — CRs in SUBMITTED/UNDER_REVIEW for 2+ days
- `detectHighRiskSignals(teamId)` — Risks with riskScore >= 16 and status OPEN

Each returns `Signal[]` following the existing pattern.

**Step 3: Register in signals route**

In `app/api/command-center/signals/route.ts`:
- Import new detection functions
- Add to the `Promise.all` parallel fetch
- Merge into `allSignals`
- Add to `summary.byType`

**Step 4: Commit**

```bash
git add lib/command-center/ app/api/command-center/
git commit -m "feat(vendor-tracker): integrate vendor signals into Command Center"
```

---

## Task 19: Vendor Notifications

**Files:**
- Modify: `lib/notifications.ts`

**Step 1: Add vendor notification functions**

Append to `lib/notifications.ts`:

```typescript
// ============================================
// Vendor Tracker Notifications
// ============================================

export async function notifyChangeRequestSubmitted({
  teamId,
  changeRequestTitle,
  changeRequestId,
  vendorName,
  submittedByName,
  submittedById,
}: {
  teamId: string;
  changeRequestTitle: string;
  changeRequestId: string;
  vendorName: string;
  submittedByName: string;
  submittedById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Change request submitted',
      message: `${submittedByName} submitted "${changeRequestTitle}" for ${vendorName}`,
      type: 'warning',
      link: `/vendors/change-requests?cr=${changeRequestId}`,
      metadata: { changeRequestId, vendorName },
    },
    submittedById
  );
}

export async function notifyChangeRequestApproved({
  userId,
  changeRequestTitle,
  changeRequestId,
  vendorName,
  approvedByName,
}: {
  userId: string;
  changeRequestTitle: string;
  changeRequestId: string;
  vendorName: string;
  approvedByName: string;
}) {
  return createNotification({
    userId,
    title: 'Change request approved',
    message: `${approvedByName} approved "${changeRequestTitle}" for ${vendorName}`,
    type: 'success',
    link: `/vendors/change-requests?cr=${changeRequestId}`,
    metadata: { changeRequestId },
  });
}

export async function notifySLABreach({
  teamId,
  vendorName,
  vendorId,
  slaName,
  currentValue,
  target,
}: {
  teamId: string;
  vendorName: string;
  vendorId: string;
  slaName: string;
  currentValue: string;
  target: string;
}) {
  return createTeamNotification(teamId, {
    title: 'SLA Breach detected',
    message: `${vendorName}: "${slaName}" is at ${currentValue} (target: ${target})`,
    type: 'error',
    link: `/vendors/${vendorId}?tab=slas`,
    metadata: { vendorId, slaName },
  });
}

export async function notifyRenewalApproaching({
  teamId,
  vendorName,
  vendorId,
  renewalDate,
  daysUntil,
}: {
  teamId: string;
  vendorName: string;
  vendorId: string;
  renewalDate: Date;
  daysUntil: number;
}) {
  return createTeamNotification(teamId, {
    title: 'Vendor renewal approaching',
    message: `${vendorName} contract renews in ${daysUntil} days (${renewalDate.toLocaleDateString()})`,
    type: daysUntil <= 7 ? 'warning' : 'info',
    link: `/vendors/${vendorId}`,
    metadata: { vendorId, renewalDate, daysUntil },
  });
}

export async function notifyAIChangeDetected({
  userId,
  vendorName,
  vendorId,
  changeRequestId,
  detectedTitle,
}: {
  userId: string;
  vendorName: string;
  vendorId: string;
  changeRequestId: string;
  detectedTitle: string;
}) {
  return createNotification({
    userId,
    title: 'AYA detected a change request',
    message: `Possible change request from ${vendorName}: "${detectedTitle}". Review the draft.`,
    type: 'info',
    link: `/vendors/change-requests?cr=${changeRequestId}`,
    metadata: { vendorId, changeRequestId },
  });
}
```

**Step 2: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat(vendor-tracker): add vendor notification functions"
```

---

## Task 20: Final Integration & Polish

**Files:**
- Verify all pages render without errors
- Verify API routes return correct data
- Verify Prisma migration applies cleanly

**Step 1: Run Prisma generate and verify schema**

```bash
npx prisma generate
npx prisma migrate dev --name add-vendor-tracker-models
```

**Step 2: Verify build**

```bash
npm run build
```

Fix any TypeScript errors.

**Step 3: Manual smoke test**

- Navigate to `/vendors` — dashboard loads
- Navigate to `/vendors/list` — empty state shows, can create vendor
- Navigate to `/vendors/change-requests` — kanban renders
- Navigate to `/vendors/risks` — heatmap renders
- Navigate to `/vendors/playbooks` — playbook library renders
- Create a vendor → verify it appears in list
- Create a change request → verify AI analysis triggers
- Create a risk → verify heatmap updates

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(vendor-tracker): final integration and polish"
```
