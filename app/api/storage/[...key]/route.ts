// app/api/storage/[...key]/route.ts
// Serves files from local storage (.storage/knowledge-base/) during development.
// In production, documents are served directly via Supabase signed URLs.

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

const BASE_DIR = path.join(process.cwd(), ".storage", "knowledge-base");

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    // key is an array of path segments, e.g. ["kb", "team1", "kb1", "folder1", "doc1", "file.pdf"]
    const storageKey = key.join("/");
    const filePath = path.join(BASE_DIR, storageKey);

    // Security: prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(BASE_DIR))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = await fs.readFile(filePath);

    // Try to read content type from sidecar .meta file
    let contentType = "application/octet-stream";
    try {
      const meta = await fs.readFile(filePath + ".meta", "utf-8");
      const parsed = JSON.parse(meta);
      if (parsed.contentType) contentType = parsed.contentType;
    } catch {
      // Fall back to extension-based detection
      const ext = path.extname(filePath).toLowerCase();
      if (MIME_MAP[ext]) contentType = MIME_MAP[ext];
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("[Storage API] Error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
