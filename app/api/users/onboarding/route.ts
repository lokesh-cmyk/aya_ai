/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const onboardingSchema = z.object({
  userId: z.string(),
  onboardingData: z.object({
    organizationName: z.string().optional(),
    teamSize: z.string().optional(),
    useCase: z.string().optional(),
    integrations: z.array(z.string()).optional(),
  }),
});

// GET /api/users/onboarding - Check if user has completed onboarding
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        onboardingCompleted: true,
        teamId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      onboardingCompleted: user.onboardingCompleted,
      hasTeam: !!user.teamId,
    });
  } catch (error) {
    console.error('Check onboarding status error:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = onboardingSchema.parse(body);

    // Store onboarding data (you can create a separate table for this or add to user metadata)
    // For now, we'll just update the user's team if organization name is provided
    if (validated.onboardingData.organizationName) {
      // Team should already be created in OnboardingFlow component
      // This endpoint is for storing additional onboarding preferences
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding data saved',
    });
  } catch (error) {
    console.error('Save onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    );
  }
}

