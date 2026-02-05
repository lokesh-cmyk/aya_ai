import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Get allowed email addresses for inbox filtering
 * Returns emails from added contacts and team members
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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
        contacts: [],
        teamMembers: [],
      });
    }

    // Fetch contacts and team members for the user's team
    const [contacts, teamMembers] = await Promise.all([
      prisma.contact.findMany({
        where: { teamId: user.teamId },
        select: { email: true },
      }),
      prisma.user.findMany({
        where: { teamId: user.teamId },
        select: { email: true },
      }),
    ]);

    return NextResponse.json({
      contacts: contacts.filter(c => c.email), // Only include contacts with emails
      teamMembers: teamMembers.filter(m => m.email), // Only include members with emails
    });
  } catch (error: any) {
    console.error('[Allowed Emails Route] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch allowed emails',
        message: error.message,
        contacts: [],
        teamMembers: [],
      },
      { status: 500 }
    );
  }
}
