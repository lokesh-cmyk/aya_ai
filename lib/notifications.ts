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

// ============================================
// Vendor Tracker Notifications
// ============================================

export async function notifyChangeRequestSubmitted({
  teamId,
  changeRequestTitle,
  changeRequestId,
  vendorName,
  submittedByName,
  submittedById,
}: {
  teamId: string;
  changeRequestTitle: string;
  changeRequestId: string;
  vendorName: string;
  submittedByName: string;
  submittedById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'Change request submitted',
      message: `${submittedByName} submitted "${changeRequestTitle}" for ${vendorName}`,
      type: 'warning',
      link: `/vendors/change-requests?cr=${changeRequestId}`,
      metadata: { changeRequestId, vendorName },
    },
    submittedById
  );
}

export async function notifyChangeRequestApproved({
  userId,
  changeRequestTitle,
  changeRequestId,
  vendorName,
  approvedByName,
}: {
  userId: string;
  changeRequestTitle: string;
  changeRequestId: string;
  vendorName: string;
  approvedByName: string;
}) {
  return createNotification({
    userId,
    title: 'Change request approved',
    message: `${approvedByName} approved "${changeRequestTitle}" for ${vendorName}`,
    type: 'success',
    link: `/vendors/change-requests?cr=${changeRequestId}`,
    metadata: { changeRequestId },
  });
}

export async function notifyChangeRequestRejected({
  userId,
  changeRequestTitle,
  changeRequestId,
  vendorName,
  rejectedByName,
  reason,
}: {
  userId: string;
  changeRequestTitle: string;
  changeRequestId: string;
  vendorName: string;
  rejectedByName: string;
  reason?: string;
}) {
  return createNotification({
    userId,
    title: 'Change request rejected',
    message: `${rejectedByName} rejected "${changeRequestTitle}" for ${vendorName}${reason ? `: ${reason}` : ''}`,
    type: 'error',
    link: `/vendors/change-requests?cr=${changeRequestId}`,
    metadata: { changeRequestId, reason },
  });
}

export async function notifySLABreach({
  teamId,
  vendorName,
  vendorId,
  slaName,
  currentValue,
  target,
}: {
  teamId: string;
  vendorName: string;
  vendorId: string;
  slaName: string;
  currentValue: string;
  target: string;
}) {
  return createTeamNotification(teamId, {
    title: 'SLA Breach detected',
    message: `${vendorName}: "${slaName}" is at ${currentValue} (target: ${target})`,
    type: 'error',
    link: `/vendors/${vendorId}?tab=slas`,
    metadata: { vendorId, slaName },
  });
}

export async function notifyRenewalApproaching({
  teamId,
  vendorName,
  vendorId,
  renewalDate,
  daysUntil,
}: {
  teamId: string;
  vendorName: string;
  vendorId: string;
  renewalDate: Date;
  daysUntil: number;
}) {
  return createTeamNotification(teamId, {
    title: 'Vendor renewal approaching',
    message: `${vendorName} contract renews in ${daysUntil} days (${renewalDate.toLocaleDateString()})`,
    type: daysUntil <= 7 ? 'warning' : 'info',
    link: `/vendors/${vendorId}`,
    metadata: { vendorId, renewalDate: renewalDate.toISOString(), daysUntil },
  });
}

export async function notifyAIChangeDetected({
  userId,
  vendorName,
  vendorId,
  changeRequestId,
  detectedTitle,
}: {
  userId: string;
  vendorName: string;
  vendorId: string;
  changeRequestId: string;
  detectedTitle: string;
}) {
  return createNotification({
    userId,
    title: 'AYA detected a change request',
    message: `Possible change request from ${vendorName}: "${detectedTitle}". Review the draft.`,
    type: 'info',
    link: `/vendors/change-requests?cr=${changeRequestId}`,
    metadata: { vendorId, changeRequestId },
  });
}

export async function notifyHighRiskCreated({
  teamId,
  riskTitle,
  riskId,
  riskScore,
  vendorName,
  createdByName,
  createdById,
}: {
  teamId: string;
  riskTitle: string;
  riskId: string;
  riskScore: number;
  vendorName?: string;
  createdByName: string;
  createdById: string;
}) {
  return createTeamNotification(
    teamId,
    {
      title: 'High risk identified',
      message: `${createdByName} identified risk "${riskTitle}" (score: ${riskScore})${vendorName ? ` for ${vendorName}` : ''}`,
      type: 'error',
      link: `/vendors/risks?risk=${riskId}`,
      metadata: { riskId, riskScore, vendorName },
    },
    createdById
  );
}
