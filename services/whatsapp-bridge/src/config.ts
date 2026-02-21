import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.WHATSAPP_BRIDGE_PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  apiKey: process.env.WHATSAPP_BRIDGE_API_KEY!,
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || "3", 10),
};

// Validate required env vars at startup
const required = ["DATABASE_URL", "WHATSAPP_BRIDGE_API_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
