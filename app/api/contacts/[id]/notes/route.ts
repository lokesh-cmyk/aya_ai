import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createNoteSchema = z.object({
  content: z.string().min(1),
  isPrivate: z.boolean().optional(),
  authorId: z.string(),
  parentId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = createNoteSchema.parse(body);

    // Extract mentions from content
    const mentions = validated.content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];

    const note = await prisma.note.create({
      data: {
        ...validated,
        contactId: params.id,
        mentions,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}