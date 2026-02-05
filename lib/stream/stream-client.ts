/* eslint-disable @typescript-eslint/no-explicit-any */
import { StreamChat } from 'stream-chat';

// Initialize Stream Chat client (server-side)
export function getStreamServerClient() {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Missing Stream.io environment variables:');
    console.error('STREAM_API_KEY:', apiKey ? 'Set' : 'MISSING');
    console.error('STREAM_API_SECRET:', apiSecret ? 'Set' : 'MISSING');
    throw new Error('Stream.io API key and secret are required. Add STREAM_API_KEY and STREAM_API_SECRET to your .env file');
  }

  return StreamChat.getInstance(apiKey, apiSecret);
}

// Avoid passing Google avatar URLs to Stream to prevent 429 from repeated requests
function safeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("googleusercontent.com") || url.includes("lh3.google")) return undefined;
  return url;
}

// Generate Stream token for a user
export async function generateStreamToken(userId: string, userData?: { name?: string; email?: string; image?: string }) {
  const serverClient = getStreamServerClient();

  await serverClient.upsertUser({
    id: userId,
    name: userData?.name,
    email: userData?.email,
    image: safeImageUrl(userData?.image),
  } as any);

  const token = serverClient.createToken(userId);
  return token;
}

// Ensure multiple users exist in Stream (e.g. before creating a channel). Skips token creation.
export async function ensureStreamUsers(
  users: Array<{ id: string; name?: string | null; email?: string | null; image?: string | null }>
) {
  if (users.length === 0) return;
  const serverClient = getStreamServerClient();
  for (const u of users) {
    await serverClient.upsertUser({
      id: u.id,
      name: u.name ?? undefined,
      email: u.email ?? undefined,
      image: safeImageUrl(u.image ?? undefined),
    } as any);
  }
}
