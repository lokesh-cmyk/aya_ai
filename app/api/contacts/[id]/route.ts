import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
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
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        twitterHandle: body.twitterHandle,
        facebookId: body.facebookId,
        tags: body.tags,
        customFields: body.customFields,
        isVerified: body.isVerified,
      },
      include: {
        messages: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          }
        },
        notes: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.contact.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
