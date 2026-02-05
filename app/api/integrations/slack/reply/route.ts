/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SlackClient } from '@/lib/integrations/slack';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * POST: Send a reply to a Slack message (with optional file upload)
 */
export async function POST(request: NextRequest) {
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

    // Check if request has multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let channelId: string;
    let text: string;
    let threadTs: string | undefined;
    let messageId: string | undefined;
    let file: File | null = null;
    let filename: string | undefined;

    if (isMultipart) {
      // Handle file upload with FormData
      const formData = await request.formData();
      channelId = formData.get('channelId') as string;
      text = (formData.get('text') as string) || '';
      threadTs = formData.get('threadTs') as string | undefined;
      messageId = formData.get('messageId') as string | undefined;
      file = formData.get('file') as File | null;
      filename = formData.get('filename') as string | undefined;

      if (!channelId) {
        return NextResponse.json(
          { error: 'Channel ID is required' },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON request (text only)
      const body = await request.json();
      const replySchema = z.object({
        channelId: z.string().min(1, 'Channel ID is required'),
        text: z.string().min(1, 'Message text is required'),
        threadTs: z.string().optional(),
        messageId: z.string().optional(),
      });
      const validated = replySchema.parse(body);
      channelId = validated.channelId;
      text = validated.text;
      threadTs = validated.threadTs;
      messageId = validated.messageId;
    }

    // Initialize Slack client
    const slackClient = new SlackClient(session.user.id, user?.teamId || null);

    let result: any;

    // If file is provided, upload file; otherwise send text message
    if (file && file.size > 0) {
      // Convert File to Buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      result = await slackClient.uploadFile(
        channelId,
        buffer,
        filename || file.name,
        text || undefined, // Use text as initial comment
        threadTs
      );
    } else {
      // Send text message only
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Message text is required when no file is provided' },
          { status: 400 }
        );
      }
      
      result = await slackClient.sendMessage(
        channelId,
        text,
        threadTs
      );
    }

    // Optionally save the message to database for tracking
    // Note: Slack messages are primarily stored in Slack, but we can track outbound messages
    try {
      // Try to find or create a contact for this channel
      const contact = await prisma.contact.findFirst({
        where: {
          teamId: user?.teamId || undefined,
          // You might want to store channel info in customFields
        },
      });

      if (contact) {
        await prisma.message.create({
          data: {
            content: file ? `[File: ${filename || file.name}] ${text || ''}`.trim() : text,
            channel: 'SLACK',
            direction: 'OUTBOUND',
            status: 'SENT',
            externalId: result.message?.ts || result.file?.id,
            contactId: contact.id,
            userId: session.user.id,
            sentAt: new Date(),
            metadata: {
              channelId: channelId,
              threadTs: threadTs || result.message?.ts,
              slackMessageTs: result.message?.ts,
              fileId: result.file?.id,
              fileName: filename || file?.name,
              hasFile: !!file,
            },
          },
        });
      }
    } catch (dbError: any) {
      // Don't fail the request if DB save fails
      console.warn('[Slack Reply] Failed to save message to DB:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: {
        ts: result.message?.ts || result.file?.id,
        channel: result.channel || channelId,
        text: result.message?.text || text,
      },
      file: result.file ? {
        id: result.file.id,
        name: result.file.name,
        url: result.file.url_private,
      } : undefined,
    });
  } catch (error: any) {
    console.error('[slack/reply] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to send Slack reply',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
