# Stream.io Chat Setup Guide

This guide will help you set up Stream.io Chat for real-time team messaging in UnifiedBox.

## Prerequisites

1. A Stream.io account (sign up at [getstream.io](https://getstream.io))
2. Create a new app in your Stream.io dashboard

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Stream.io Chat Configuration
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here

# Public API Key (for client-side)
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key_here
```

## Setup Steps

### 1. Create a Stream.io Account

1. Go to [getstream.io](https://getstream.io)
2. Sign up for a free account
3. Create a new app in the dashboard
4. Copy your **API Key** and **API Secret**

### 2. Configure Environment Variables

1. Add `STREAM_API_KEY` and `STREAM_API_SECRET` to your `.env` file (server-side)
2. Add `NEXT_PUBLIC_STREAM_API_KEY` to your `.env` file (client-side, same as API key)

### 3. Features Enabled

Once configured, you'll have access to:

- ✅ **Real-time messaging** with ultra-low latency (~9ms API response)
- ✅ **Typing indicators** - See when team members are typing
- ✅ **1-on-1 direct messages** - Chat with individual team members
- ✅ **Group chats** - Create group conversations with multiple team members
- ✅ **File sharing** - Send images, documents, and files
- ✅ **Audio messages** - Record and send voice messages
- ✅ **Message threads** - Reply to specific messages
- ✅ **Read receipts** - See when messages are read
- ✅ **Message search** - Search through chat history
- ✅ **Presence indicators** - See who's online

## Stream.io Benefits

- **Low Latency**: ~9ms API response time for instant messaging
- **Scalability**: Supports 5M+ users in a single channel
- **99.999% Uptime SLA**: Enterprise-grade reliability
- **Built-in Features**: Typing indicators, read receipts, file uploads, and more
- **Security**: SOC2, ISO 27001, HIPAA ready

## Free Tier

Stream.io offers a generous free tier:
- 1,000 MAU (Monthly Active Users)
- Unlimited messages
- All core features included

For more information, visit [Stream.io Pricing](https://getstream.io/pricing/)
