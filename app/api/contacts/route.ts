/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  twitterHandle: z.string().optional(),
  facebookId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  teamId: z.string().optional(),
});

// Get all contacts
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      // Filter by team
      teamId: user?.teamId || null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
          include: {
            author: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            notes: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.contact.count({ where });

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// Create new contact
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("better-auth.session_token");
    
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

    const body = await request.json();
    const validated = createContactSchema.parse(body);

    // Check for duplicates within the same team
    const existing = await prisma.contact.findFirst({
      where: {
        teamId: user?.teamId || null,
        OR: [
          validated.phone ? { phone: validated.phone } : {},
          validated.email ? { email: validated.email } : {},
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Contact already exists', contact: existing },
        { status: 409 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        ...validated,
        teamId: validated.teamId || user?.teamId || null,
      },
      include: {
        messages: true,
        notes: true,
      }
    });

    // Bidirectional contact creation via Inngest:
    // If the contact's email matches an existing user account,
    // and that user has an organization (teamId),
    // automatically create a reverse contact entry in that user's organization
    if (validated.email) {
      try {
        const { inngest } = await import('@/lib/inngest/client');
        await inngest.send({
          name: 'contact/create.bidirectional',
          data: {
            contactId: contact.id,
            contactEmail: validated.email,
            userId: session.user.id,
            teamId: user?.teamId || '',
          },
        }).catch((err) => {
          console.error('Failed to send bidirectional contact event:', err);
          // Don't fail the contact creation if event fails
        });
      } catch (error: any) {
        // Log error but don't fail the contact creation
        console.error('Error triggering bidirectional contact creation:', error);
      }
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
