// app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  twitterHandle: z.string().optional(),
  facebookId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  teamId: z.string().optional(),
});

// Get all contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

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
    const body = await request.json();
    const validated = createContactSchema.parse(body);

    // Check for duplicates
    const existing = await prisma.contact.findFirst({
      where: {
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
      data: validated,
      include: {
        messages: true,
        notes: true,
      }
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
