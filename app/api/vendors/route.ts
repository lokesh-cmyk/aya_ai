/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vendors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { createTeamNotification } from '@/lib/notifications';
import { syncVendorContact } from '@/lib/vendors/sync-vendor-contact';

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'INACTIVE', 'OFFBOARDING']).optional(),
  website: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  description: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  renewalDate: z.string().optional(),
  renewalType: z.enum(['AUTO', 'MANUAL']).optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  contractValue: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email('Email is required for vendor contacts'),
        phone: z.string().optional(),
        role: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  slas: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        metric: z.string().min(1),
        target: z.string().min(1),
      })
    )
    .optional(),
});

// Get all vendors
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({
        vendors: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      teamId: user.teamId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1,
          },
          slas: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              changeRequests: true,
              risks: true,
              contacts: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.vendor.count({ where }),
    ]);

    return NextResponse.json({
      vendors,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// Create new vendor
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true, name: true, email: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'You must be part of a team to create vendors' },
        { status: 400 }
      );
    }

    // Check if user is admin or editor
    if (user.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Only admins and editors can create vendors' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createVendorSchema.parse(body);

    // Build nested create data
    const createData: any = {
      name: validated.name,
      category: validated.category,
      status: validated.status,
      website: validated.website || null,
      description: validated.description,
      contractStart: validated.contractStart
        ? new Date(validated.contractStart)
        : undefined,
      contractEnd: validated.contractEnd
        ? new Date(validated.contractEnd)
        : undefined,
      renewalDate: validated.renewalDate
        ? new Date(validated.renewalDate)
        : undefined,
      renewalType: validated.renewalType,
      billingCycle: validated.billingCycle,
      contractValue: validated.contractValue,
      tags: validated.tags || [],
      customFields: validated.customFields,
      teamId: user.teamId,
      createdById: session.user.id,
    };

    // Add nested contacts creation
    if (validated.contacts && validated.contacts.length > 0) {
      createData.contacts = {
        create: validated.contacts.map((c) => ({
          name: c.name,
          email: c.email || null,
          phone: c.phone,
          role: c.role,
          isPrimary: c.isPrimary ?? false,
        })),
      };
    }

    // Add nested SLA creation
    if (validated.slas && validated.slas.length > 0) {
      createData.slas = {
        create: validated.slas.map((s) => ({
          name: s.name,
          description: s.description,
          metric: s.metric,
          target: s.target,
        })),
      };
    }

    const vendor = await prisma.vendor.create({
      data: createData,
      include: {
        contacts: true,
        slas: true,
      },
    });

    // Sync vendor contacts to Contact table so their emails appear in unified inbox
    if (vendor.contacts.length > 0) {
      await Promise.all(
        vendor.contacts
          .filter((c) => c.email)
          .map((c) =>
            syncVendorContact({
              name: c.name,
              email: c.email!,
              phone: c.phone,
              vendorId: vendor.id,
              vendorContactId: c.id,
              teamId: user.teamId!,
            })
          )
      );
    }

    // Send team notification
    try {
      const creatorName = user.name || user.email || 'Someone';
      await createTeamNotification(
        user.teamId,
        {
          title: 'New vendor added',
          message: `${creatorName} added a new vendor: "${vendor.name}"`,
          type: 'info',
          link: `/vendors/${vendor.id}`,
          metadata: { vendorId: vendor.id, createdById: session.user.id },
        },
        session.user.id
      );
    } catch (notifyError) {
      console.warn('[VendorAPI] Notification failed:', notifyError);
    }

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
