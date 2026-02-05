/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInviteEmailParams {
  to: string;
  teamName: string;
  inviteUrl: string;
  teamCode: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  inviterName?: string;
  expiresAt: Date;
}

/**
 * Send team invitation email via Resend
 */
export async function sendInviteEmail(params: SendInviteEmailParams) {
  const { to, teamName, inviteUrl, teamCode, role, inviterName, expiresAt } = params;

  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appName = process.env.APP_NAME || 'AYA AI';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    EDITOR: 'Editor',
    VIEWER: 'Viewer',
  };

  const roleDescriptions: Record<string, string> = {
    ADMIN: 'Full access to manage the organization and all settings',
    EDITOR: 'Can create and edit content, manage contacts and messages',
    VIEWER: 'Read-only access to view conversations and analytics',
  };

  const subject = `${inviterName ? `${inviterName} invited you` : 'You\'ve been invited'} to join ${teamName} on ${appName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                ${appName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
                You've been invited to join ${teamName}
              </h2>
              
              ${inviterName ? `
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                <strong>${inviterName}</strong> has invited you to join their organization on ${appName}.
              </p>
              ` : `
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                You've been invited to join an organization on ${appName}.
              </p>
              `}
              
              <!-- Team Code Badge -->
              <div style="margin: 0 0 24px; padding: 20px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                  Your Team Code
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${teamCode}
                </p>
                <p style="margin: 12px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.9);">
                  Use this code when signing up to join ${teamName}
                </p>
              </div>
              
              <!-- Role Badge -->
              <div style="margin: 0 0 24px; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1e40af;">
                  Your Role: ${roleLabels[role]}
                </p>
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  ${roleDescriptions[role]}
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
              </p>
              
              <!-- Expiration Notice -->
              <div style="margin: 32px 0 0; padding: 16px; background-color: #fef3c7; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>⏰ This invitation expires on ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
You've been invited to join ${teamName} on ${appName}

${inviterName ? `${inviterName} has invited you to join their organization.` : 'You\'ve been invited to join an organization.'}

YOUR TEAM CODE: ${teamCode}
Use this code when signing up to join ${teamName}

Your Role: ${roleLabels[role]}
${roleDescriptions[role]}

Accept your invitation by clicking the link below:
${inviteUrl}

This invitation expires on ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message || 'Failed to send invitation email');
    }

    return {
      success: true,
      emailId: data?.id,
    };
  } catch (error) {
    console.error('Send invite email error:', error);
    throw error;
  }
}
