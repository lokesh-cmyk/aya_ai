import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

// Build social providers config conditionally
const socialProviders: any = {};

// Only add Google provider if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account", // Always ask to select account for better UX
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "change-this-secret-in-production",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
  // Account linking: When a user signs in with a social provider (Google) using
  // an email that already exists, link the account to the existing user
  // instead of creating a new user
  account: {
    accountLinking: {
      enabled: true,
      // Trust emails from OAuth providers (Google verifies email ownership)
      trustedProviders: ["google"],
    },
  },
});

export type Session = typeof auth.$Infer.Session;

