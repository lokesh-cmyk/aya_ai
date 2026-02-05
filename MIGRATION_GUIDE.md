# Database Migration Guide

## Fixing User Creation Issues

### Step 1: Update Database Schema

The Prisma schema has been updated to include Better Auth tables. Run the following commands:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database (creates Better Auth tables)
npx prisma db push

# Or create a migration (recommended for production)
npx prisma migrate dev --name add_better_auth_tables
```

### Step 2: Verify Tables Created

After migration, verify these tables exist in your database:
- `Session` - Stores user sessions
- `Account` - Stores OAuth accounts
- `Verification` - Stores email verification tokens
- `User` - Updated with Better Auth fields (emailVerified, image)

### Step 3: Environment Variables

Ensure your `.env` file has:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/unified_inbox?schema=public"
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Step 4: Test User Creation

1. Start the dev server: `npm run dev`
2. Navigate to `/signup`
3. Fill in the form:
   - Name
   - Email
   - Password (min 8 characters)
   - Organization name or team code
4. Submit and verify user is created

## Troubleshooting

### Error: "Table already exists"
If you get this error, the tables might already exist. You can:
1. Drop and recreate (development only):
   ```bash
   npx prisma migrate reset
   ```
2. Or manually check what tables exist and adjust schema

### Error: "User creation failed"
1. Check database connection in `.env`
2. Verify Better Auth tables exist
3. Check server logs for detailed error messages
4. Ensure Prisma client is generated: `npx prisma generate`

### Error: "Session not found"
1. Clear browser cookies
2. Verify `BETTER_AUTH_SECRET` is set
3. Check that session table exists

## Organization/Team Setup

### Creating a Team
When signing up, users can:
1. **Create New Organization**: Enter organization name
2. **Join Existing Team**: Enter team invitation code (team ID)

### Team Management
- Teams are automatically created when users sign up with organization name
- Users can be assigned to teams after creation via admin panel
- Team ID can be shared as "invitation code" for new members

## Next Steps

1. ✅ Run database migration
2. ✅ Test user signup
3. ✅ Verify team assignment works
4. ✅ Test login flow
5. ✅ Check inbox loads with user data

