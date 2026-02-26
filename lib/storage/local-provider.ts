import * as fs from "fs/promises";
import * as path from "path";
import type { StorageProvider, UploadResult } from "./types";

const BASE_DIR = path.join(process.cwd(), ".storage", "knowledge-base");

export class LocalStorageProvider implements StorageProvider {
  private async ensureDir(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  private resolvePath(key: string): string {
    return path.join(BASE_DIR, key);
  }

  async upload(key: string, file: Buffer, contentType: string): Promise<UploadResult> {
    const filePath = this.resolvePath(key);
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, file);

    // Store content type in a sidecar file
    await fs.writeFile(filePath + ".meta", JSON.stringify({ contentType }));

    const url = `/api/storage/${encodeURIComponent(key)}`;
    return { url, key };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(filePath + ".meta").catch(() => {});
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return `/api/storage/${encodeURIComponent(key)}`;
  }

  getPublicUrl(key: string): string {
    return `/api/storage/${encodeURIComponent(key)}`;
  }
}
