/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './prisma';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: any;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        link: params.link,
        metadata: params.metadata || {},
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for all team members
 */
export async function createTeamNotification(
  teamId: string,
  params: Omit<CreateNotificationParams, 'userId'>,
  excludeUserId?: string
) {
  try {
    const teamMembers = await prisma.user.findMany({
      where: { teamId },
      select: { id: true },
    });

    const notifications = await Promise.all(
      teamMembers
        .filter((member) => member.id !== excludeUserId)
        .map((member) =>
          prisma.notification.create({
            data: {
              userId: member.id,
              title: params.title,
              message: params.message,
              type: params.type || 'info',
              link: params.link,
              metadata: params.metadata || {},
            },
          })
        )
    );

    return notifications;
  } catch (error) {
    console.error('Error creating team notifications:', error);
    throw error;
  }
}

// ============================================
// Team Chat Notifications
// ============================================

export async function notifyTeamChatMessage({
  teamId,
  senderId,
  senderName,
  messagePreview,
  channelName,
  channelId,
}: {
  teamId: string;
  senderId: string;
  senderName: string;
  messagePreview: string;
  channelName?: string;
  channelId?: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: `New message from ${senderName}`,
      message: channelName
        ? `in #${channelName}: ${messagePreview.slice(0, 100)}${messagePreview.length > 100 ? '...' : ''}`
        : messagePreview.slice(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      type: 'info',
      link: channelId ? `/chat?channel=${channelId}` : '/chat',
      metadata: { senderId, channelId, channelName },
    },
    senderId // Exclude the sender from notifications
  );
}

// ============================================
// Team Member Notifications
// ============================================

export async function notifyMemberAdded({
  teamId,
  newMemberName,
  newMemberEmail,
  addedByName,
  addedById,
}: {
  teamId: string;
  newMemberName: string;
  newMemberEmail: string;
  addedByName: string;
  addedById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'New team member',
      message: `${addedByName} added ${newMemberName} (${newMemberEmail}) to the team`,
      type: 'success',
      link: '/settings/organization',
      metadata: { newMemberEmail, addedById },
    },
    addedById
  );
}

export async function notifyMemberRemoved({
  teamId,
  removedMemberName,
  removedById,
  removedByName,
}: {
  teamId: string;
  removedMemberName: string;
  removedById: string;
  removedByName: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Team member removed',
      message: `${removedByName} removed ${removedMemberName} from the team`,
      type: 'warning',
      link: '/settings/organization',
      metadata: { removedById },
    },
    removedById
  );
}

// ============================================
// Task Notifications
// ============================================

export async function notifyTaskCreated({
  teamId,
  taskTitle,
  taskId,
  createdByName,
  createdById,
  spaceId,
  spaceName,
}: {
  teamId: string;
  taskTitle: string;
  taskId: string;
  createdByName: string;
  createdById: string;
  spaceId?: string;
  spaceName?: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'New task created',
      message: `${createdByName} created "${taskTitle}"${spaceName ? ` in ${spaceName}` : ''}`,
      type: 'info',
      link: `/crm?task=${taskId}`,
      metadata: { taskId, spaceId, createdById },
    },
    createdById
  );
}

export async function notifyTaskAssigned({
  assigneeId,
  taskTitle,
  taskId,
  assignedByName,
}: {
  assigneeId: string;
  taskTitle: string;
  taskId: string;
  assignedByName: string;
}) {
  return createNotification({
    userId: assigneeId,
    title: 'Task assigned to you',
    message: `${assignedByName} assigned "${taskTitle}" to you`,
    type: 'info',
    link: `/crm?task=${taskId}`,
    metadata: { taskId },
  });
}

export async function notifyTaskStatusChanged({
  teamId,
  taskTitle,
  taskId,
  oldStatus,
  newStatus,
  changedByName,
  changedById,
}: {
  teamId: string;
  taskTitle: string;
  taskId: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  changedById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Task status updated',
      message: `${changedByName} moved "${taskTitle}" from ${oldStatus} to ${newStatus}`,
      type: 'info',
      link: `/crm?task=${taskId}`,
      metadata: { taskId, oldStatus, newStatus, changedById },
    },
    changedById
  );
}

export async function notifyTaskCompleted({
  teamId,
  taskTitle,
  taskId,
  completedByName,
  completedById,
}: {
  teamId: string;
  taskTitle: string;
  taskId: string;
  completedByName: string;
  completedById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Task completed',
      message: `${completedByName} completed "${taskTitle}"`,
      type: 'success',
      link: `/crm?task=${taskId}`,
      metadata: { taskId, completedById },
    },
    completedById
  );
}

// ============================================
// Space & Folder Notifications
// ============================================

export async function notifySpaceCreated({
  teamId,
  spaceName,
  spaceId,
  createdByName,
  createdById,
}: {
  teamId: string;
  spaceName: string;
  spaceId: string;
  createdByName: string;
  createdById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'New space created',
      message: `${createdByName} created a new space: "${spaceName}"`,
      type: 'info',
      link: `/crm?space=${spaceId}`,
      metadata: { spaceId, createdById },
    },
    createdById
  );
}

export async function notifyFolderCreated({
  teamId,
  folderName,
  folderId,
  spaceName,
  spaceId,
  createdByName,
  createdById,
}: {
  teamId: string;
  folderName: string;
  folderId: string;
  spaceName?: string;
  spaceId?: string;
  createdByName: string;
  createdById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'New folder created',
      message: `${createdByName} created folder "${folderName}"${spaceName ? ` in ${spaceName}` : ''}`,
      type: 'info',
      link: spaceId ? `/crm?space=${spaceId}&folder=${folderId}` : `/crm?folder=${folderId}`,
      metadata: { folderId, spaceId, createdById },
    },
    createdById
  );
}

// ============================================
// Meeting Notifications
// ============================================

export async function notifyMeetingStarted({
  teamId,
  meetingTitle,
  meetingId,
  meetingUrl,
  startedById,
}: {
  teamId: string;
  meetingTitle: string;
  meetingId: string;
  meetingUrl?: string;
  startedById?: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Meeting started',
      message: `"${meetingTitle}" has started${meetingUrl ? ' - Join now!' : ''}`,
      type: 'info',
      link: `/meetings/${meetingId}`,
      metadata: { meetingId, meetingUrl },
    },
    startedById
  );
}

export async function notifyMeetingEnded({
  teamId,
  meetingTitle,
  meetingId,
  duration,
  hasRecording,
  hasTranscript,
}: {
  teamId: string;
  meetingTitle: string;
  meetingId: string;
  duration?: number;
  hasRecording?: boolean;
  hasTranscript?: boolean;
}) {
  const durationStr = duration
    ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)`
    : '';
  const extras = [];
  if (hasRecording) extras.push('recording');
  if (hasTranscript) extras.push('transcript');
  const extrasStr = extras.length > 0 ? ` - ${extras.join(' & ')} available` : '';

  return createTeamNotification(teamId, {
    title: 'Meeting ended',
    message: `"${meetingTitle}" has ended${durationStr}${extrasStr}`,
    type: 'success',
    link: `/meetings/${meetingId}`,
    metadata: { meetingId, duration, hasRecording, hasTranscript },
  });
}

export async function notifyMeetingInsightsReady({
  userId,
  meetingTitle,
  meetingId,
  insightCount,
}: {
  userId: string;
  meetingTitle: string;
  meetingId: string;
  insightCount: number;
}) {
  return createNotification({
    userId,
    title: 'Meeting insights ready',
    message: `${insightCount} AI insights generated for "${meetingTitle}"`,
    type: 'success',
    link: `/meetings/${meetingId}`,
    metadata: { meetingId, insightCount },
  });
}

// ============================================
// Contact/CRM Notifications
// ============================================

export async function notifyNewMessage({
  userId,
  contactName,
  contactId,
  messagePreview,
  channel,
}: {
  userId: string;
  contactName: string;
  contactId: string;
  messagePreview: string;
  channel: string;
}) {
  return createNotification({
    userId,
    title: `New message from ${contactName}`,
    message: `via ${channel}: ${messagePreview.slice(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
    type: 'info',
    link: `/inbox?contact=${contactId}`,
    metadata: { contactId, channel },
  });
}
