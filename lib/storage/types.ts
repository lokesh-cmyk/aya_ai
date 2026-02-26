export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(key: string, file: Buffer, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
}

export function buildStorageKey(
  teamId: string,
  knowledgeBaseId: string,
  folderId: string,
  documentId: string,
  filename: string
): string {
  return `kb/${teamId}/${knowledgeBaseId}/${folderId}/${documentId}/${filename}`;
}
