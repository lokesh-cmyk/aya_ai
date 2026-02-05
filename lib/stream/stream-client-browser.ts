/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { StreamChat } from 'stream-chat';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';

let streamClient: StreamChat | null = null;
let isConnecting = false;
let connectedUserId: string | null = null;

export function useStreamClient() {
  const { data: session } = useSession();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setClient(null);
      setIsConnected(false);
      return;
    }

    // If already connected for this user, don't reconnect
    if (streamClient && connectedUserId === session.user.id && isConnected) {
      setClient(streamClient);
      setIsConnected(true);
      return;
    }

    // If already connecting, wait
    if (isConnecting) {
      return;
    }

    const initClient = async () => {
      try {
        isConnecting = true;

        // Get Stream token from API
        const response = await fetch('/api/chat/stream-token');
        if (!response.ok) {
          throw new Error('Failed to get Stream token');
        }

        const { token, apiKey } = await response.json();

        if (!apiKey) {
          throw new Error('Stream API key not configured');
        }

        // Initialize or reuse client
        if (!streamClient) {
          streamClient = StreamChat.getInstance(apiKey);
        }

        // Only connect if not already connected for this user
        if (connectedUserId !== session.user.id) {
          // Get user data for better profile
          let userData: any = null;
          try {
            const userResponse = await fetch('/api/users');
            if (userResponse.ok) {
              const usersData = await userResponse.json();
              userData = usersData.users?.find((u: any) => u.id === session.user.id);
            }
          } catch (err) {
            console.warn('Could not fetch user data for Stream profile:', err);
          }

          // Omit Google avatar URLs to avoid 429 from repeated requests
          const rawImage = userData?.image || session.user.image;
          const image =
            rawImage && !String(rawImage).includes('googleusercontent.com') && !String(rawImage).includes('lh3.google')
              ? rawImage
              : undefined;

          await streamClient.connectUser(
            {
              id: session.user.id,
              name: userData?.name || session.user.name || session.user.email || 'User',
              email: userData?.email || session.user.email,
              image,
            } as any,
            token
          );
          
          connectedUserId = session.user.id;
        }

        setClient(streamClient);
        setIsConnected(true);
        setError(null);
        isConnecting = false;
      } catch (err: any) {
        console.error('Stream client initialization error:', err);
        setError(err.message);
        setIsConnected(false);
        setClient(null);
        isConnecting = false;
      }
    };

    initClient();

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // streamClient?.disconnectUser();
    };
  }, [session?.user?.id, isConnected]);

  return { client, isConnected, error };
}
