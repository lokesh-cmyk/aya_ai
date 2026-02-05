# Neon + Prisma setup

To fix **P1001: Can't reach database server** and run migrations against [Neon](https://neon.tech), use the following.

**Prisma 7:** Connection URLs are configured in `prisma.config.ts` only (not in `schema.prisma`). The app uses `DATABASE_URL` via the adapter in `lib/prisma.ts`; the CLI (migrate, db push) uses the URL from `prisma.config.ts`, which should be `DIRECT_URL` for Neon.

## 1. Connection strings in `.env`

Neon requires SSL and a longer `connect_timeout` (so the compute can wake from idle). Use **two** URLs:

- **DATABASE_URL** – pooled connection (for the app and Prisma Client via adapter). Host has `-pooler` in the name.
- **DIRECT_URL** – direct (non-pooled) connection used by **Prisma Migrate** (see `prisma.config.ts`). Same URL but host **without** `-pooler`.

Add to `.env`:

```env
# Pooled (for app / Prisma Client) – add SSL and longer timeout
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connect_timeout=10"

# Direct (for prisma migrate dev / db push) – same URL but replace -pooler. with .
DIRECT_URL="postgresql://USER:PASSWORD@ep-XXX.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connect_timeout=10"
```

**Rules:**

1. **SSL:** Both URLs must end with `?sslmode=require&channel_binding=require` (or include those in existing query params).
2. **Timeout:** Add `&connect_timeout=10` so Neon has time to start an idle compute (avoids P1001).
3. **DIRECT_URL host:** Same as `DATABASE_URL` but change the host from  
   `ep-round-credit-ahmccybg-pooler.c-3.us-east-1.aws.neon.tech`  
   to  
   `ep-round-credit-ahmccybg.c-3.us-east-1.aws.neon.tech`  
   (remove `-pooler` from the endpoint id).

## 2. Get the URLs from Neon

1. Open [Neon Console](https://console.neon.tech) → your project.
2. Click **Connect** and pick the branch/database.
3. Copy the **pooled** connection string → use it as `DATABASE_URL` and add `?sslmode=require&channel_binding=require&connect_timeout=10`.
4. Copy the **direct** (non-pooled) connection string → use it as `DIRECT_URL` with the same query params.

## 3. Run migrations

```bash
npx prisma migrate dev --name init
# or
npx prisma db push
```

If you still see P1001:

- Confirm the Neon project is not paused and the host/credentials are correct.
- Try a larger timeout, e.g. `connect_timeout=15`.
- Check firewall/VPN; outbound access to `*.neon.tech:5432` must be allowed.

Reference: [Neon – Connect from Prisma](https://neon.com/docs/guides/prisma).
