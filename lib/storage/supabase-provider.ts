import { createClient } from "@supabase/supabase-js";
import type { StorageProvider, UploadResult } from "./types";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "knowledge-base";

export class SupabaseStorageProvider implements StorageProvider {
  private client;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    this.client = createClient(url, key);
  }

  async upload(key: string, file: Buffer, contentType: string): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .upload(key, file, {
        contentType,
        upsert: false,
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const url = this.getPublicUrl(key);
    return { url, key };
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .download(key);

    if (error) throw new Error(`Supabase download failed: ${error.message}`);
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(BUCKET)
      .remove([key]);

    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(key, expiresIn);

    if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  getPublicUrl(key: string): string {
    const { data } = this.client.storage
      .from(BUCKET)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}
