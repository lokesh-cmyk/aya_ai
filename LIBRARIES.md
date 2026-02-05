# Libraries & Dependencies

## Quick Installation

Copy and paste this command into your terminal to install all required dependencies:

```bash
npm install \
  next@14.0.4 \
  react@18.2.0 \
  react-dom@18.2.0 \
  @prisma/client@5.7.0 \
  twilio@4.20.0 \
  resend@3.0.0 \
  zod@3.22.4 \
  @tanstack/react-query@5.13.0 \
  lucide-react@0.294.0 \
  recharts@2.10.3 \
  clsx@2.0.0 \
  tailwind-merge@2.1.0 \
    \
  date-fns@3.0.0 \
  crypto-js@4.2.0 \
  && \
npm install -D \
  prisma@5.7.0 \
  typescript@5.3.3 \
  @types/node@20.10.0 \
  @types/react@18.2.42 \
  @types/react-dom@18.2.17 \
  tailwindcss@3.3.6 \
  postcss@8.4.32 \
  autoprefixer@10.4.16 \
  eslint@8.55.0 \
  eslint-config-next@14.0.4 \
  @typescript-eslint/eslint-plugin@6.15.0 \
  @typescript-eslint/parser@6.15.0
```

## Post-Installation Setup

After installing dependencies, run these commands:

```bash
# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

## Production Dependencies

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.0.4 | Next.js framework with App Router |
| `react` | 18.2.0 | React library |
| `react-dom` | 18.2.0 | React DOM rendering |

### Database & ORM
| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | 5.7.0 | Prisma ORM client for database operations |

### Communication Integrations
| Package | Version | Purpose |
|---------|---------|---------|
| `twilio` | 4.20.0 | SMS and WhatsApp integration |
| `resend` | 3.0.0 | Email sending API |

### Authentication
| Package | Version | Purpose |
|---------|---------|---------|
| `better-auth` | latest | Authentication with role-based access control |

### State Management & Data Fetching
| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | 5.13.0 | Server state management, caching, and data fetching |

### Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | 3.22.4 | TypeScript-first schema validation |

### UI & Icons
| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | 0.294.0 | Icon library with React components |
| `recharts` | 2.10.3 | Charting library for analytics dashboard |

### Styling Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `clsx` | 2.0.0 | Utility for constructing className strings |
| `tailwind-merge` | 2.1.0 | Merge Tailwind CSS classes without conflicts |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | 3.0.0 | Date formatting and manipulation |
| `crypto-js` | 4.2.0 | Cryptographic functions |

## Development Dependencies

### Database Tools
| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | 5.7.0 | Prisma CLI for migrations and schema management |

### TypeScript & Type Definitions
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.3.3 | TypeScript compiler |
| `@types/node` | 20.10.0 | Node.js type definitions |
| `@types/react` | 18.2.42 | React type definitions |
| `@types/react-dom` | 18.2.17 | React DOM type definitions |

### CSS & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 3.3.6 | Utility-first CSS framework |
| `postcss` | 8.4.32 | CSS transformation tool |
| `autoprefixer` | 10.4.16 | PostCSS plugin for vendor prefixes |

### Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 8.55.0 | JavaScript/TypeScript linter |
| `eslint-config-next` | 14.0.4 | Next.js ESLint configuration |
| `@typescript-eslint/eslint-plugin` | 6.15.0 | TypeScript ESLint plugin |
| `@typescript-eslint/parser` | 6.15.0 | TypeScript ESLint parser |

## Optional Dependencies (Not Included)

If you want to add testing or additional features:

### Testing
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test  # For E2E testing
```

### Additional Integrations
```bash
npm install @upstash/ratelimit  # Rate limiting
npm install bullmq ioredis  # Message queue
npm install @aws-sdk/client-s3  # File uploads to S3
```

## Package.json Reference

Your `package.json` should look like this:

```json
{
  "name": "unified-inbox",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "@tanstack/react-query": "^5.13.0",
    "better-auth": "latest",
    "clsx": "^2.0.0",
    "crypto-js": "^4.2.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.294.0",
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.3",
    "resend": "^3.0.0",
    "tailwind-merge": "^2.1.0",
    "twilio": "^4.20.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.4",
    "postcss": "^8.4.32",
    "prisma": "^5.7.0",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.3"
  }
}
```

## Troubleshooting

### Installation Issues

**Problem**: `npm ERR! code ERESOLVE`
```bash
# Solution: Use --legacy-peer-deps flag
npm install --legacy-peer-deps
```

**Problem**: Prisma client not generating
```bash
# Solution: Manually generate
npx prisma generate
```

**Problem**: TypeScript errors after installation
```bash
# Solution: Restart TypeScript server in VS Code
# Press: Cmd/Ctrl + Shift + P
# Type: "TypeScript: Restart TS Server"
```

### Version Conflicts

If you encounter version conflicts with existing packages:

1. Delete `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

3. Reinstall:
   ```bash
   npm install
   ```

## Environment Setup

After installing dependencies, create your `.env` file:

```bash
cp .env.example .env
```

Fill in the required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `TWILIO_ACCOUNT_SID` - From Twilio Console
- `TWILIO_AUTH_TOKEN` - From Twilio Console
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- `RESEND_API_KEY` - From Resend dashboard
- Other API keys as needed

## Verification

Verify your installation:

```bash
# Check installed packages
npm list --depth=0

# Verify TypeScript
npx tsc --version

# Verify Prisma
npx prisma --version

# Check for vulnerabilities
npm audit
```

## Next Steps

1. ✅ Install dependencies (above)
2. ✅ Configure `.env` file
3. ✅ Run `npx prisma generate`
4. ✅ Run `npx prisma db push`
5. ✅ Start development: `npm run dev`

---

**Total Installation Time**: ~2-5 minutes depending on internet speed

**Total Package Size**: ~500MB (node_modules)