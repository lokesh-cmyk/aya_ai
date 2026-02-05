"use client";

import { FrontendClientProvider } from "@pipedream/connect-react";
import { createFrontendClient } from "@pipedream/sdk/browser";
import { useSession } from "@/lib/auth-client";
import { ReactNode } from "react";

const getProjectEnvironment = (): 'development' | 'production' => {
  const env = process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ENVIRONMENT || 'development';
  return env === 'production' ? 'production' : 'development';
};

export function PipedreamClientProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  // According to Pipedream Connect docs: https://pipedream.com/docs/connect
  // - Frontend client uses tokenCallback to fetch Connect tokens from server
  // - Server uses OAuth Client Credentials to generate tokens (never expose secrets client-side)
  // - Connect tokens are single-use and expire quickly
  const client = createFrontendClient({
    projectId: process.env.NEXT_PUBLIC_PIPEDREAM_PROJECT_ID!,
    projectEnvironment: getProjectEnvironment(),
    tokenCallback: async ({ externalUserId }) => {
      // According to Pipedream Connect docs:
      // - Token must be fetched fresh each time (tokens expire and are single-use)
      // - externalUserId must match between token generation and connectAccount
      // - Token must not be undefined
      try {
        const userId = externalUserId || session?.user?.id;
        
        if (!userId) {
          throw new Error('No external user ID available for token generation');
        }
        
        console.log('Fetching Connect token for externalUserId:', userId);
        
        const response = await fetch('/api/connect/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            externalUserId: userId 
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to fetch token' }));
          console.error('Token fetch error:', error);
          throw new Error(error.error || 'Failed to fetch Connect token');
        }

        const data = await response.json();
        
        // Critical: Token must not be undefined (causes 404 errors)
        if (!data.token || data.token === 'undefined') {
          console.error('Invalid token received:', data);
          console.error('Token value:', data.token);
          console.error('Token type:', typeof data.token);
          throw new Error('No valid token received from server');
        }

        // Ensure token is a string and not undefined/null
        const token = String(data.token).trim();
        
        if (!token || token === 'undefined' || token === 'null') {
          console.error('Token is invalid after conversion:', token);
          throw new Error('Token is invalid after conversion');
        }

        console.log('Token fetched successfully via tokenCallback');
        console.log('Token length:', token.length);
        console.log('Token preview (first 10 chars):', token.substring(0, 10));
        console.log('Token type:', typeof token);
        
        // According to Pipedream SDK, tokenCallback must return CreateTokenResponse object
        // CreateTokenResponse requires: { token: ConnectToken, expiresAt: Date, connectLinkUrl: string }
        // All fields are required according to the type definition
        const result = {
          token: token as any, // ConnectToken type (string)
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 4 * 60 * 60 * 1000), // Default 4 hours if not provided
          connectLinkUrl: data.connectLinkUrl || '', // Empty string if not provided (required field)
        };
        
        console.log('Returning CreateTokenResponse:', {
          tokenLength: result.token.length,
          expiresAt: result.expiresAt.toISOString(),
          hasConnectLinkUrl: !!result.connectLinkUrl,
        });
        
        return result;
      } catch (error: any) {
        // Log full error details for debugging
        console.error('Token callback error (full):', error);
        console.error('Token callback error type:', typeof error);
        console.error('Token callback error message:', error?.message);
        console.error('Token callback error stack:', error?.stack);
        
        // Re-throw with more context
        const errorMessage = error?.message || 'Failed to fetch Connect token';
        throw new Error(`Token callback failed: ${errorMessage}`);
      }
    },
    externalUserId: session?.user?.id || 'anonymous',
  });

  return (
    <FrontendClientProvider client={client}>
      {children}
    </FrontendClientProvider>
  );
}
