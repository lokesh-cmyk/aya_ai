import Redis from "ioredis";
import { config } from "./config";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(config.redisUrl);
    publisher.on("error", (err) => console.error("Redis publisher error:", err));
  }
  return publisher;
}

export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(config.redisUrl);
    subscriber.on("error", (err) => console.error("Redis subscriber error:", err));
  }
  return subscriber;
}

export async function publish(channel: string, data: unknown): Promise<void> {
  await getPublisher().publish(channel, JSON.stringify(data));
}

export async function cleanup(): Promise<void> {
  if (publisher) await publisher.quit();
  if (subscriber) await subscriber.quit();
}
