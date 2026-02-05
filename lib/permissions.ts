import { prisma } from '@/lib/prisma';

/**
 * Check if a user is a team ADMIN
 * Team admins have full access to all resources in their team
 */
export async function isTeamAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  return user?.role === 'ADMIN';
}

/**
 * Check if a user is a team ADMIN and belongs to the same team as a resource
 */
export async function isTeamAdminForResource(
  userId: string,
  teamId: string | null | undefined
): Promise<boolean> {
  if (!teamId) return false;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, teamId: true },
  });
  
  return user?.role === 'ADMIN' && user?.teamId === teamId;
}

/**
 * Check if a user has permission to perform an action on a space
 * Team admins have full access, others need appropriate space membership
 */
export async function canAccessSpace(
  userId: string,
  spaceId: string,
  requiredRole?: 'ADMIN' | 'EDITOR' | 'VIEWER'
): Promise<{ allowed: boolean; isTeamAdmin: boolean }> {
  // Get space and user info
  const [space, user] = await Promise.all([
    prisma.space.findUnique({
      where: { id: spaceId },
      select: { teamId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, teamId: true },
    }),
  ]);

  // Check if user is team admin
  const isTeamAdmin = user?.role === 'ADMIN' && user?.teamId === space?.teamId;
  
  if (isTeamAdmin) {
    return { allowed: true, isTeamAdmin: true };
  }

  // For non-admins, check space membership
  const spaceMember = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId,
      },
    },
  });

  if (!spaceMember) {
    return { allowed: false, isTeamAdmin: false };
  }

  // Check role requirement
  if (requiredRole) {
    const roleHierarchy = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };
    const memberLevel = roleHierarchy[spaceMember.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];
    
    return { 
      allowed: memberLevel >= requiredLevel, 
      isTeamAdmin: false 
    };
  }

  return { allowed: true, isTeamAdmin: false };
}
