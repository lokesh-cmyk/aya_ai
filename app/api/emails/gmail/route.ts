/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGmailClient } from '@/lib/gmail/client';
import { prisma } from '@/lib/prisma';

/**
 * Fetch Gmail emails using Gmail API
 * Returns emails formatted for the unified inbox
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
        total: 0,
        message: 'User must be part of a team',
      });
    }

    // Fetch allowed email addresses: contacts and team members
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

    // Create a Set of allowed email addresses (case-insensitive)
    const allowedEmails = new Set<string>();
    contacts.forEach(contact => {
      if (contact.email) {
        allowedEmails.add(contact.email.toLowerCase());
      }
    });
    teamMembers.forEach(member => {
      if (member.email) {
        allowedEmails.add(member.email.toLowerCase());
      }
    });

    console.log(`[Gmail Route] Allowed emails: ${allowedEmails.size} (${contacts.length} contacts, ${teamMembers.length} team members)`);

    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '50');
    const query = searchParams.get('query') || 'in:inbox';

    console.log(`[Gmail Route] Fetching emails for user ${session.user.id}, query: ${query}, maxResults: ${maxResults}`);

    // Get Gmail API client
    const client = await getGmailClient(session.user.id, user?.teamId || null);

    // Search for emails
    const messages = await client.searchEmails(query, maxResults);
    console.log(`[Gmail Route] Found ${messages.length} messages`);

    if (messages.length === 0) {
      return NextResponse.json({
        contacts: [],
        total: 0,
      });
    }

    // Fetch full details for each message (limit to prevent timeout)
    const emailsWithDetails = [];
    const fetchLimit = Math.min(messages.length, 50); // Limit to 50 to prevent timeouts
    
    for (let i = 0; i < fetchLimit; i++) {
      const msg = messages[i];
      try {
        const messageData = await client.getEmail(msg.id);
        emailsWithDetails.push(messageData);
      } catch (err: any) {
        console.error(`[Gmail Route] Failed to fetch message ${msg.id}:`, err.message);
      }
    }

    console.log(`[Gmail Route] Fetched details for ${emailsWithDetails.length} messages`);

    // Format emails for unified inbox
    const emailMap = new Map<string, any>();

    for (const email of emailsWithDetails) {
      try {
        // Extract headers
        const headers = email.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name === 'From');
        const subjectHeader = headers.find((h: any) => h.name === 'Subject');
        const dateHeader = headers.find((h: any) => h.name === 'Date');

        if (!fromHeader) continue;

        // Extract email address and name from "Name <email@example.com>" format
        const fromValue = fromHeader.value;
        const emailMatch = fromValue.match(/<(.+)>/);
        const emailAddress = emailMatch ? emailMatch[1] : fromValue.trim();
        const emailAddressLower = emailAddress.toLowerCase();

        // Filter: Only show emails from added contacts and team members
        if (!allowedEmails.has(emailAddressLower)) {
          continue; // Skip this email - not from an allowed contact or team member
        }

        const senderName = emailMatch 
          ? fromValue.replace(/<.+>/, '').trim() 
          : emailAddress.split('@')[0];

        // Get snippet from email
        const snippet = email.snippet || '';
        const subject = subjectHeader?.value || '(no subject)';
        const date = dateHeader?.value || new Date().toISOString();
        const labels = email.labelIds || [];
        const isUnread = labels.includes('UNREAD');

        // Create or update contact entry
        if (!emailMap.has(emailAddress)) {
          emailMap.set(emailAddress, {
            id: `gmail-${emailAddress}`,
            name: senderName,
            email: emailAddress,
            isGmail: true,
            messages: [],
            _count: { messages: 0 },
          });
        }

        const contact = emailMap.get(emailAddress)!;
        contact.messages.push({
          id: email.id,
          content: snippet || subject,
          channel: 'EMAIL',
          direction: 'INBOUND',
          createdAt: new Date(date).toISOString(),
          readAt: isUnread ? null : new Date().toISOString(),
          externalId: email.id,
          threadId: email.threadId,
          subject,
          from: emailAddress,
          labels,
          metadata: {
            gmailId: email.id,
            threadId: email.threadId,
            labels,
          },
        });
        contact._count.messages++;
      } catch (err: any) {
        console.error(`[Gmail Route] Error processing email ${email.id}:`, err.message);
      }
    }

    // Convert map to array and sort by most recent message
    const gmailContacts = Array.from(emailMap.values()).map((contact) => ({
      ...contact,
      messages: contact.messages.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));

    console.log(`[Gmail Route] Returning ${gmailContacts.length} contacts with emails`);

    return NextResponse.json({
      contacts: gmailContacts,
      total: gmailContacts.length,
    });
  } catch (error: any) {
    console.error('[Gmail Route] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Gmail emails',
        message: error.message,
        contacts: [],
      },
      { status: 500 }
    );
  }
}