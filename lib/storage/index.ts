import type { StorageProvider } from "./types";
import { SupabaseStorageProvider } from "./supabase-provider";
import { LocalStorageProvider } from "./local-provider";

export type { StorageProvider, UploadResult } from "./types";
export { buildStorageKey } from "./types";

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) return storageInstance;

  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "supabase":
      storageInstance = new SupabaseStorageProvider();
      break;
    case "local":
      storageInstance = new LocalStorageProvider();
      break;
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  return storageInstance;
}
