/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDailyDigestEmailParams {
  to: string;
  teamName: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send daily digest email via Resend
 */
export async function sendDailyDigestEmail(params: SendDailyDigestEmailParams) {
  const { to, teamName, subject, html, text } = params;

  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appName = process.env.APP_NAME || 'AYA AI';

  // Wrap the AI-generated HTML in a professional email template
  const wrappedHtml = `
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
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">
                Daily Digest for ${teamName}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${html}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-align: center;">
                This is an automated daily digest from ${appName}.
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

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text: `Daily Digest for ${teamName}\n\n${text}`,
      html: wrappedHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message || 'Failed to send daily digest email');
    }

    return {
      success: true,
      emailId: data?.id,
    };
  } catch (error) {
    console.error('Send daily digest email error:', error);
    throw error;
  }
}
