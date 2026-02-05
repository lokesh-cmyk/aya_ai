# Authentication & Landing Page Setup Guide

This guide will help you set up the new landing page and authentication system using Better Auth.

## What's Been Implemented

### 1. Landing Page (`/`)
- Beautiful hero section with UnifiedBox branding
- Feature highlights
- Integration showcase
- Call-to-action sections
- Responsive design

### 2. Authentication System
- **Login Page** (`/login`) - Email and password authentication
- **Signup Page** (`/signup`) - User registration
- **Protected Routes** - Inbox page requires authentication
- **Session Management** - 7-day session expiration

### 3. Inbox UI (`/inbox`)
- Modern design matching the provided screenshot
- Left sidebar with integration icons (Gmail, LinkedIn, Slack, WhatsApp, Instagram, Teams, Outlook)
- Central inbox with message list
- Search bar: "Start typing to ask or search UnifiedBox"
- Right sidebar with AI suggestions
- Bottom-left greeting widget
- User profile dropdown with sign out

## Setup Instructions

### 1. Install Dependencies

Better Auth has already been installed. If you need to reinstall:

```bash
npm install better-auth --legacy-peer-deps
```

### 2. Database Setup

Better Auth will automatically create the necessary tables when you run Prisma migrations. The tables include:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts (if using social login)
- `verification` - Email verification tokens

Run the following commands:

```bash
# Generate Prisma client (if not already done)
npx prisma generate

# Push schema to database (creates Better Auth tables)
npx prisma db push
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox?schema=public"

# Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-here-change-in-production"

# Optional: Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important**: Generate a secure secret key for `BETTER_AUTH_SECRET`:
```bash
# Generate a random secret (Linux/Mac)
openssl rand -base64 32

# Or use an online generator
```

### 4. Start Development Server

```bash
npm run dev
```

Visit:
- Landing page: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Inbox (protected): `http://localhost:3000/inbox`

## File Structure

```
app/
├── (auth)/              # Authentication pages
│   ├── login/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (marketing)/         # Landing page
│   └── page.tsx
├── inbox/               # Protected inbox page
│   ├── layout.tsx       # Auth check
│   └── page.tsx
└── api/
    └── auth/
        └── [...all]/
            └── route.ts  # Better Auth API routes

components/
└── inbox/
    ├── KinsoInbox.tsx   # Main inbox UI (UnifiedBoxInbox component)
    └── InboxHeader.tsx  # Header with user menu

lib/
├── auth.ts              # Better Auth server config
└── auth-client.ts       # Better Auth client config

middleware.ts            # Route protection
```

## Authentication Flow

1. **Unauthenticated users**:
   - Can access landing page (`/`)
   - Can access login/signup pages
   - Redirected to `/login` when trying to access `/inbox`

2. **Authenticated users**:
   - Can access `/inbox`
   - Redirected to `/inbox` when trying to access `/login` or `/signup`
   - Redirected to `/inbox` when accessing landing page

## Features

### Landing Page
- Responsive design
- Gradient branding
- Feature cards
- Integration showcase
- Call-to-action buttons

### Authentication
- Email/password authentication
- Session management
- Protected routes via middleware
- Optional Google OAuth (configure in `.env`)

### Inbox UI
- Modern, clean design
- Integration sidebar
- Message list with avatars
- AI suggestion cards
- Search functionality
- User profile menu

## Customization

### Change Session Duration
Edit `lib/auth.ts`:
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days (in seconds)
  updateAge: 60 * 60 * 24,     // 1 day
}
```

### Enable Email Verification
Edit `lib/auth.ts`:
```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true, // Change to true
}
```

### Add More Social Providers
Edit `lib/auth.ts` and add to `socialProviders`:
```typescript
socialProviders: {
  google: { ... },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    enabled: !!process.env.GITHUB_CLIENT_ID,
  },
}
```

## Troubleshooting

### "Session not found" errors
- Make sure `BETTER_AUTH_SECRET` is set in `.env`
- Clear browser cookies and try again
- Check that database tables were created

### Database errors
- Run `npx prisma db push` to create tables
- Verify `DATABASE_URL` is correct in `.env`
- Check database connection

### Redirect loops
- Clear browser cookies
- Check middleware.ts logic
- Verify session cookie name matches Better Auth default

## Next Steps

1. Connect the inbox to real message data
2. Implement the AI suggestions functionality
3. Add real integration connections (Gmail, Slack, etc.)
4. Customize the greeting widget with real user data
5. Add more social login providers if needed

## Support

For Better Auth documentation, visit: https://better-auth.com

For issues specific to this implementation, check the code comments in:
- `lib/auth.ts` - Server configuration
- `lib/auth-client.ts` - Client configuration
- `middleware.ts` - Route protection

