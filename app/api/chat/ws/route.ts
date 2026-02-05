/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// This route handler is for WebSocket upgrade requests
// The actual WebSocket server is initialized in the server setup
export async function GET(request: NextRequest) {
  // WebSocket upgrade is handled by the WebSocket server
  // This endpoint is just for documentation/health check
  return NextResponse.json({
    message: 'WebSocket endpoint - use ws:// protocol to connect',
    path: '/api/chat/ws',
  });
}
