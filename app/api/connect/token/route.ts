import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PipedreamClient, ProjectEnvironment } from '@pipedream/sdk/server';
import { auth, getSessionCookie } from '@/lib/auth';

const getProjectEnvironment = (): ProjectEnvironment => {
  const env = process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development';
  const projectEnv = env === 'production' ? ProjectEnvironment.Production : ProjectEnvironment.Development;
  console.log('Pipedream Project Environment:', env, '->', projectEnv);
  return projectEnv;
};

// Validate required environment variables
const validateEnvVars = () => {
  const required = [
    'PIPEDREAM_CLIENT_ID',
    'PIPEDREAM_CLIENT_SECRET',
    'PIPEDREAM_PROJECT_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required Pipedream environment variables:', missing);
    throw new Error(`Missing required Pipedream environment variables: ${missing.join(', ')}`);
  }
  
  console.log('Pipedream environment variables validated');
  console.log('PIPEDREAM_PROJECT_ID:', process.env.PIPEDREAM_PROJECT_ID ? 'Set' : 'Missing');
  console.log('PIPEDREAM_CLIENT_ID:', process.env.PIPEDREAM_CLIENT_ID ? 'Set' : 'Missing');
  console.log('PIPEDREAM_PROJECT_ENVIRONMENT:', process.env.PIPEDREAM_PROJECT_ENVIRONMENT || 'development (default)');
};

// Validate on module load
validateEnvVars();

// According to Pipedream OAuth docs: https://pipedream.com/docs/rest-api/auth#oauth
// - Uses Client Credentials OAuth flow
// - Access tokens expire after 1 hour
// - PipedreamClient SDK automatically refreshes tokens
// - All credentials must be stored server-side (never expose in client code)
const pd = new PipedreamClient({
  clientId: process.env.PIPEDREAM_CLIENT_ID!,
  clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
  projectEnvironment: getProjectEnvironment(),
  projectId: process.env.PIPEDREAM_PROJECT_ID!,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get authenticated user from Better Auth session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { externalUserId } = await request.json();

    // Use the authenticated user's ID as externalUserId if not provided
    const userId = externalUserId || session.user.id;

    // Get the origin from the request to allow it
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'http://localhost:3000';
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ...(process.env.PIPEDREAM_ALLOWED_ORIGINS?.split(',') || []),
    ].filter(Boolean);

    // According to Pipedream docs:
    // - tokens.create() generates a fresh token for the externalUserId
    // - Token expires quickly and is single-use
    // - allowedOrigins must include the origin making the request
    console.log('Creating Connect token for externalUserId:', userId);
    console.log('Allowed origins:', allowedOrigins);
    
    // Generate a Connect token for this user
    const response = await pd.tokens.create({
      externalUserId: userId,
      allowedOrigins: allowedOrigins,
    });

    // Log full response for debugging
    console.log('Pipedream token creation response keys:', Object.keys(response || {}));
    console.log('Pipedream token creation response:', {
      hasToken: !!response.token,
      tokenType: typeof response.token,
      hasExpiresAt: !!response.expiresAt,
      hasConnectLinkUrl: !!response.connectLinkUrl,
    });

    // According to Pipedream SDK, CreateTokenResponse has:
    // - token: the token string (required)
    // - expiresAt: expiration time (optional)
    // - connectLinkUrl: optional URL
    
    // Critical: Ensure token is present
    if (!response.token) {
      console.error('Token creation returned undefined token');
      console.error('Full response:', JSON.stringify(response, null, 2));
      throw new Error('Failed to generate Connect token: token is undefined');
    }

    // Ensure token is a string
    const token = String(response.token).trim();
    const expiresAt = response.expiresAt;
    const connectLinkUrl = response.connectLinkUrl;

    // Validate token is not empty
    if (!token || token.length === 0) {
      console.error('Token is empty after conversion');
      throw new Error('Token is empty after conversion');
    }

    console.log('Connect token created successfully');
    console.log('Token value (first 20 chars):', token.substring(0, 20));
    console.log('Token length:', token.length);
    console.log('Token type:', typeof token);
    console.log('Token expires at:', expiresAt);

    return NextResponse.json({ 
      token: token, // The token string for the SDK
      expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
      connectLinkUrl,
    });
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Create Connect token error (full):', error);
    console.error('Create Connect token error type:', typeof error);
    console.error('Create Connect token error keys:', Object.keys(error || {}));
    console.error('Create Connect token error message:', error?.message);
    console.error('Create Connect token error stack:', error?.stack);
    console.error('Create Connect token error response:', error?.response);
    console.error('Create Connect token error status:', error?.status);
    
    // Extract detailed error message
    let errorMessage = 'Failed to create Connect token';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error?.response?.data || error?.details || null,
      },
      { status: error?.status || 500 }
    );
  }
}
