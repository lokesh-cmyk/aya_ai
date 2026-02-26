import type { StorageProvider } from "./types";
import { SupabaseStorageProvider } from "./supabase-provider";

export type { StorageProvider, UploadResult } from "./types";
export { buildStorageKey } from "./types";

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) return storageInstance;

  const provider = process.env.STORAGE_PROVIDER || "supabase";

  switch (provider) {
    case "supabase":
      storageInstance = new SupabaseStorageProvider();
      break;
    // Future providers:
    // case "s3":
    //   storageInstance = new S3StorageProvider();
    //   break;
    // case "azure":
    //   storageInstance = new AzureBlobStorageProvider();
    //   break;
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  return storageInstance;
}
