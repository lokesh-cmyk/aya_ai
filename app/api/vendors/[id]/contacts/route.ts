/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/vendors/[id]/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { syncVendorContact } from '@/lib/vendors/sync-vendor-contact';

const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Email is required for vendor contacts'),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

// Helper: authenticate and return session + user
async function authenticate(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = getSessionCookie(cookieStore);

  if (!sessionCookie) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { auth } = await import('@/lib/auth');
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true, role: true },
  });

  return { session, user };
}

// List contacts for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // Verify vendor exists and belongs to user's team
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    if (vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const contacts = await prisma.vendorContact.findMany({
      where: { vendorId: id },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('List vendor contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor contacts' },
      { status: 500 }
    );
  }
}

// Add a contact to a vendor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await authenticate(request);
    if ('error' in result) return result.error;
    const { user } = result;

    // VIEWER cannot create
    if (user?.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Only admins and editors can create contacts' },
        { status: 403 }
      );
    }

    // Verify vendor exists and belongs to user's team
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    if (vendor.teamId !== user?.teamId) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createContactSchema.parse(body);

    // If isPrimary is true, unset all other primary contacts for this vendor
    if (validated.isPrimary) {
      await prisma.vendorContact.updateMany({
        where: { vendorId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.vendorContact.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        role: validated.role || null,
        isPrimary: validated.isPrimary ?? false,
        vendorId: id,
      },
    });

    // Sync to Contact table so vendor emails appear in unified inbox
    await syncVendorContact({
      name: validated.name,
      email: validated.email,
      phone: validated.phone || null,
      vendorId: id,
      vendorContactId: contact.id,
      teamId: vendor.teamId,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Create vendor contact error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vendor contact' },
      { status: 500 }
    );
  }
}
