# Unified Knowledge Base Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified Knowledge Base system in Aya where teams can store, organize, search, and retrieve documents (PDF, images, markdown, text, audio, meeting transcripts) across projects.

**Architecture:** Hybrid approach — Neon/Prisma for metadata & folder structure, Supabase Storage (behind a provider abstraction) for file blobs, Pinecone for semantic vector search, PostgreSQL full-text search for keyword matching, Inngest for background processing (text extraction, embedding generation, transcript auto-save).

**Tech Stack:** Next.js 16 (App Router), Prisma 7, Supabase Storage, Pinecone, OpenAI embeddings, Inngest, React Query, Shadcn/Radix UI, Lucide icons, react-markdown, react-pdf.

**Design Doc:** `docs/plans/2026-02-26-knowledge-base-design.md`

---

## Phase 1: Foundation (Database + Storage)

### Task 1: Add KB Enums and Models to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add enums to schema.prisma**

Add these enums after the existing enum definitions (after `ChangeRequestStatus`):

```prisma
enum KBFolderType {
  GENERAL
  MEETING_TRANSCRIPTS
  UPLOADS
}

enum KBFileType {
  PDF
  IMAGE
  MARKDOWN
  TEXT
  AUDIO
  TRANSCRIPT
  OTHER
}

enum KBDocumentSource {
  UPLOAD
  MEETING_TRANSCRIPT
  AI_GENERATED
  INTEGRATION
}
```

**Step 2: Add KnowledgeBase model**

Add after the last model in schema.prisma:

```prisma
model KnowledgeBase {
  id          String   @id @default(cuid())
  teamId      String
  name        String
  description String?
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  team      Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdBy User       @relation("KBCreatedBy", fields: [createdById], references: [id])
  folders   KBFolder[]
  documents KBDocument[]
  projectSettings KBProjectSettings[]

  @@index([teamId])
}
```

**Step 3: Add KBFolder model**

```prisma
model KBFolder {
  id              String       @id @default(cuid())
  knowledgeBaseId String
  parentFolderId  String?
  name            String
  description     String?
  type            KBFolderType @default(GENERAL)
  projectId       String?
  createdById     String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  knowledgeBase KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  parentFolder  KBFolder?     @relation("FolderHierarchy", fields: [parentFolderId], references: [id])
  children      KBFolder[]    @relation("FolderHierarchy")
  project       Space?        @relation(fields: [projectId], references: [id])
  createdBy     User          @relation("KBFolderCreatedBy", fields: [createdById], references: [id])
  documents     KBDocument[]
  projectSettings KBProjectSettings[] @relation("TranscriptFolder")

  @@index([knowledgeBaseId])
  @@index([parentFolderId])
  @@index([projectId])
}
```

**Step 4: Add KBDocument model**

```prisma
model KBDocument {
  id                String           @id @default(cuid())
  folderId          String
  knowledgeBaseId   String
  title             String
  description       String?
  fileType          KBFileType
  mimeType          String
  fileSize          Int
  fileUrl           String
  storageKey        String
  content           String?
  pineconeId        String?
  source            KBDocumentSource @default(UPLOAD)
  sourceReferenceId String?
  tags              String[]
  metadata          Json?
  isArchived        Boolean          @default(false)
  currentVersion    Int              @default(1)
  uploadedById      String
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  folder        KBFolder              @relation(fields: [folderId], references: [id], onDelete: Cascade)
  knowledgeBase KnowledgeBase         @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  uploadedBy    User                  @relation("KBDocUploadedBy", fields: [uploadedById], references: [id])
  versions      KBDocumentVersion[]
  favorites     KBFavorite[]

  @@index([folderId])
  @@index([knowledgeBaseId])
  @@index([uploadedById])
  @@index([source])
  @@index([isArchived])
}
```

**Step 5: Add KBDocumentVersion model**

```prisma
model KBDocumentVersion {
  id            String   @id @default(cuid())
  documentId    String
  versionNumber Int
  fileUrl       String
  storageKey    String
  fileSize      Int
  content       String?
  pineconeId    String?
  changeNote    String?
  uploadedById  String
  createdAt     DateTime @default(now())

  document   KBDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  uploadedBy User       @relation("KBVersionUploadedBy", fields: [uploadedById], references: [id])

  @@index([documentId])
}
```

**Step 6: Add KBFavorite model**

```prisma
model KBFavorite {
  id         String   @id @default(cuid())
  userId     String
  documentId String
  createdAt  DateTime @default(now())

  user     User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  document KBDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([userId, documentId])
  @@index([userId])
}
```

**Step 7: Add KBProjectSettings model**

```prisma
model KBProjectSettings {
  id                  String   @id @default(cuid())
  projectId           String   @unique
  knowledgeBaseId     String
  autoSaveTranscripts Boolean  @default(true)
  transcriptFolderId  String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  project          Space         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  knowledgeBase    KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  transcriptFolder KBFolder?     @relation("TranscriptFolder", fields: [transcriptFolderId], references: [id])

  @@index([knowledgeBaseId])
}
```

**Step 8: Add relation fields to existing models**

Add to the `Team` model:
```prisma
knowledgeBases KnowledgeBase[]
```

Add to the `User` model:
```prisma
createdKnowledgeBases KnowledgeBase[] @relation("KBCreatedBy")
createdKBFolders      KBFolder[]      @relation("KBFolderCreatedBy")
uploadedKBDocuments   KBDocument[]    @relation("KBDocUploadedBy")
uploadedKBVersions    KBDocumentVersion[] @relation("KBVersionUploadedBy")
kbFavorites           KBFavorite[]
```

Add to the `Space` model:
```prisma
kbFolders         KBFolder[]
kbProjectSettings KBProjectSettings?
```

**Step 9: Run Prisma migration**

Run: `npx prisma migrate dev --name add-knowledge-base-models`
Expected: Migration applied successfully, new tables created.

**Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(kb): add knowledge base database models and enums"
```

---

### Task 2: Create Storage Provider Abstraction Layer

**Files:**
- Create: `lib/storage/types.ts`
- Create: `lib/storage/supabase-provider.ts`
- Create: `lib/storage/index.ts`

**Step 1: Create the StorageProvider interface**

Create `lib/storage/types.ts`:

```typescript
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
```

**Step 2: Create the Supabase Storage provider**

Create `lib/storage/supabase-provider.ts`:

```typescript
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
```

**Step 3: Create the storage factory**

Create `lib/storage/index.ts`:

```typescript
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
```

**Step 4: Install Supabase client dependency**

Run: `npm install @supabase/supabase-js`

**Step 5: Commit**

```bash
git add lib/storage/ package.json package-lock.json
git commit -m "feat(kb): add storage provider abstraction with Supabase implementation"
```

---

### Task 3: Set Up Pinecone Client

**Files:**
- Create: `lib/pinecone/client.ts`
- Create: `lib/pinecone/embeddings.ts`

**Step 1: Install Pinecone and OpenAI dependencies**

Run: `npm install @pinecone-database/pinecone`

Note: `@ai-sdk/openai` and `ai` are already installed.

**Step 2: Create Pinecone client**

Create `lib/pinecone/client.ts`:

```typescript
import { Pinecone } from "@pinecone-database/pinecone";

let pineconeInstance: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (pineconeInstance) return pineconeInstance;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY env var");

  pineconeInstance = new Pinecone({ apiKey });
  return pineconeInstance;
}

export function getKBIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || "aya-knowledge-base";
  return client.index(indexName);
}
```

**Step 3: Create embeddings utility**

Create `lib/pinecone/embeddings.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(text: string): TextChunk[] {
  const words = text.split(/\s+/);
  const chunks: TextChunk[] = [];
  let index = 0;

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim()) {
      chunks.push({ text: chunk, index });
      index++;
    }
  }

  return chunks.length > 0 ? chunks : [{ text: text.trim(), index: 0 }];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

export async function generateSingleEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}
```

**Step 4: Commit**

```bash
git add lib/pinecone/ package.json package-lock.json
git commit -m "feat(kb): add Pinecone client and embeddings utility"
```

---

## Phase 2: API Routes

### Task 4: Knowledge Base CRUD API Routes

**Files:**
- Create: `app/api/knowledge-base/route.ts`
- Create: `app/api/knowledge-base/[kbId]/route.ts`

**Step 1: Create main KB route (GET list + POST create)**

Create `app/api/knowledge-base/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { teamId: user.teamId },
      include: {
        _count: { select: { folders: true, documents: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    console.error("[KB GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch knowledge bases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true, role: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const kb = await prisma.knowledgeBase.create({
      data: {
        teamId: user.teamId,
        name: name.trim(),
        description: description?.trim() || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ knowledgeBase: kb }, { status: 201 });
  } catch (error) {
    console.error("[KB POST] Error:", error);
    return NextResponse.json({ error: "Failed to create knowledge base" }, { status: 500 });
  }
}
```

**Step 2: Create single KB route (GET detail)**

Create `app/api/knowledge-base/[kbId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
      include: {
        folders: {
          where: { parentFolderId: null },
          include: {
            children: { include: { _count: { select: { documents: true } } } },
            _count: { select: { documents: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
        },
        _count: { select: { documents: true, folders: true } },
      },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    return NextResponse.json({ knowledgeBase: kb });
  } catch (error) {
    console.error("[KB GET detail] Error:", error);
    return NextResponse.json({ error: "Failed to fetch knowledge base" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add knowledge base CRUD API routes"
```

---

### Task 5: Folder CRUD API Routes

**Files:**
- Create: `app/api/knowledge-base/[kbId]/folders/route.ts`
- Create: `app/api/knowledge-base/[kbId]/folders/[folderId]/route.ts`

**Step 1: Create folder list + create route**

Create `app/api/knowledge-base/[kbId]/folders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId } = await params;
    const { searchParams } = new URL(request.url);
    const parentFolderId = searchParams.get("parentFolderId") || null;
    const projectId = searchParams.get("projectId") || undefined;

    // Verify KB belongs to team
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const where: any = { knowledgeBaseId: kbId, parentFolderId };
    if (projectId) where.projectId = projectId;

    const folders = await prisma.kBFolder.findMany({
      where,
      include: {
        children: { select: { id: true, name: true } },
        _count: { select: { documents: true, children: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("[KB Folders GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, parentFolderId, projectId, type } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const folder = await prisma.kBFolder.create({
      data: {
        knowledgeBaseId: kbId,
        name: name.trim(),
        description: description?.trim() || null,
        parentFolderId: parentFolderId || null,
        projectId: projectId || null,
        type: type || "GENERAL",
        createdById: session.user.id,
      },
      include: {
        _count: { select: { documents: true, children: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error("[KB Folders POST] Error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
```

**Step 2: Create single folder route (PATCH update + DELETE)**

Create `app/api/knowledge-base/[kbId]/folders/[folderId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; folderId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, folderId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, parentFolderId } = body;

    const folder = await prisma.kBFolder.update({
      where: { id: folderId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(parentFolderId !== undefined && { parentFolderId }),
      },
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("[KB Folder PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; folderId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, folderId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Cascade delete handles child folders and documents in DB
    // But we also need to clean up storage files
    const documents = await prisma.kBDocument.findMany({
      where: { folderId },
      select: { storageKey: true },
    });

    // Delete from storage
    if (documents.length > 0) {
      const { getStorageProvider } = await import("@/lib/storage");
      const storage = getStorageProvider();
      await Promise.allSettled(
        documents.map((doc) => storage.delete(doc.storageKey))
      );
    }

    await prisma.kBFolder.delete({ where: { id: folderId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KB Folder DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add folder CRUD API routes"
```

---

### Task 6: Document Upload & CRUD API Routes

**Files:**
- Create: `app/api/knowledge-base/[kbId]/documents/route.ts`
- Create: `app/api/knowledge-base/[kbId]/documents/[docId]/route.ts`

**Step 1: Create document list + upload route**

Create `app/api/knowledge-base/[kbId]/documents/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { inngest } from "@/lib/inngest/client";
import { KBFileType } from "@prisma/client";

const MIME_TO_FILE_TYPE: Record<string, KBFileType> = {
  "application/pdf": "PDF",
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/gif": "IMAGE",
  "image/webp": "IMAGE",
  "image/svg+xml": "IMAGE",
  "text/markdown": "MARKDOWN",
  "text/plain": "TEXT",
  "audio/mpeg": "AUDIO",
  "audio/wav": "AUDIO",
  "audio/ogg": "AUDIO",
  "audio/webm": "AUDIO",
};

function getFileType(mimeType: string): KBFileType {
  return MIME_TO_FILE_TYPE[mimeType] || "OTHER";
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId } = await params;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const fileType = searchParams.get("fileType");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const where: any = { knowledgeBaseId: kbId, isArchived: false };
    if (folderId) where.folderId = folderId;
    if (fileType) where.fileType = fileType;

    const [documents, total] = await Promise.all([
      prisma.kBDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true } },
          _count: { select: { favorites: true, versions: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.kBDocument.count({ where }),
    ]);

    return NextResponse.json({ documents, total });
  } catch (error) {
    console.error("[KB Documents GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    const { kbId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user.teamId },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 });
    }

    const fileType = getFileType(file.type);
    const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

    // Create document record first to get the ID
    const document = await prisma.kBDocument.create({
      data: {
        knowledgeBaseId: kbId,
        folderId,
        title: title || file.name,
        description: description || null,
        fileType,
        mimeType: file.type,
        fileSize: file.size,
        fileUrl: "", // Will update after upload
        storageKey: "", // Will update after upload
        source: "UPLOAD",
        tags,
        uploadedById: session.user.id,
      },
    });

    // Upload to storage
    const storage = getStorageProvider();
    const storageKey = buildStorageKey(
      user.teamId,
      kbId,
      folderId,
      document.id,
      file.name
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await storage.upload(storageKey, buffer, file.type);

    // Update document with storage info
    const updatedDocument = await prisma.kBDocument.update({
      where: { id: document.id },
      data: {
        fileUrl: uploadResult.url,
        storageKey: uploadResult.key,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
      },
    });

    // Trigger background processing (text extraction + embedding)
    await inngest.send({
      name: "kb/document.process",
      data: {
        documentId: document.id,
        teamId: user.teamId,
      },
    });

    return NextResponse.json({ document: updatedDocument }, { status: 201 });
  } catch (error) {
    console.error("[KB Documents POST] Error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
```

**Step 2: Create single document route (GET detail, PATCH update, DELETE archive)**

Create `app/api/knowledge-base/[kbId]/documents/[docId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, docId } = await params;

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user?.teamId ?? "" },
      },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
        folder: { select: { id: true, name: true } },
        versions: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { versionNumber: "desc" },
        },
        favorites: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        _count: { select: { favorites: true, versions: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Generate signed URL for download
    const { getStorageProvider } = await import("@/lib/storage");
    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(document.storageKey, 3600);

    return NextResponse.json({
      document: {
        ...document,
        signedUrl,
        isFavorited: document.favorites.length > 0,
      },
    });
  } catch (error) {
    console.error("[KB Document GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, docId } = await params;
    const body = await request.json();
    const { title, description, tags, folderId } = body;

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user?.teamId ?? "" },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updated = await prisma.kBDocument.update({
      where: { id: docId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(tags !== undefined && { tags }),
        ...(folderId !== undefined && { folderId }),
      },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("[KB Document PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, docId } = await params;

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user?.teamId ?? "" },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Soft delete (archive)
    await prisma.kBDocument.update({
      where: { id: docId },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[KB Document DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to archive document" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add document upload and CRUD API routes"
```

---

### Task 7: Document Versions & Favorites API Routes

**Files:**
- Create: `app/api/knowledge-base/[kbId]/documents/[docId]/versions/route.ts`
- Create: `app/api/knowledge-base/[kbId]/documents/[docId]/favorite/route.ts`
- Create: `app/api/knowledge-base/[kbId]/favorites/route.ts`

**Step 1: Create version upload route**

Create `app/api/knowledge-base/[kbId]/documents/[docId]/versions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { inngest } from "@/lib/inngest/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { docId } = await params;

    const versions = await prisma.kBDocumentVersion.findMany({
      where: { documentId: docId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { versionNumber: "desc" },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[KB Versions GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId, docId } = await params;

    const document = await prisma.kBDocument.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: kbId,
        knowledgeBase: { teamId: user?.teamId ?? "" },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const changeNote = formData.get("changeNote") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Snapshot current version
    await prisma.kBDocumentVersion.create({
      data: {
        documentId: docId,
        versionNumber: document.currentVersion,
        fileUrl: document.fileUrl,
        storageKey: document.storageKey,
        fileSize: document.fileSize,
        content: document.content,
        pineconeId: document.pineconeId,
        changeNote: changeNote || null,
        uploadedById: document.uploadedById,
      },
    });

    // Upload new file
    const storage = getStorageProvider();
    const storageKey = buildStorageKey(
      user!.teamId!,
      kbId,
      document.folderId,
      docId,
      file.name
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await storage.upload(
      storageKey + `_v${document.currentVersion + 1}`,
      buffer,
      file.type
    );

    // Update document with new version
    const updatedDocument = await prisma.kBDocument.update({
      where: { id: docId },
      data: {
        fileUrl: uploadResult.url,
        storageKey: uploadResult.key,
        fileSize: file.size,
        mimeType: file.type,
        currentVersion: document.currentVersion + 1,
        content: null, // Will be re-extracted
        pineconeId: null, // Will be re-embedded
      },
    });

    // Trigger re-processing
    await inngest.send({
      name: "kb/document.process",
      data: { documentId: docId, teamId: user!.teamId! },
    });

    return NextResponse.json({ document: updatedDocument }, { status: 201 });
  } catch (error) {
    console.error("[KB Versions POST] Error:", error);
    return NextResponse.json({ error: "Failed to upload new version" }, { status: 500 });
  }
}
```

**Step 2: Create favorite toggle route**

Create `app/api/knowledge-base/[kbId]/documents/[docId]/favorite/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; docId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { docId } = await params;

    const existing = await prisma.kBFavorite.findUnique({
      where: { userId_documentId: { userId: session.user.id, documentId: docId } },
    });

    if (existing) {
      await prisma.kBFavorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    } else {
      await prisma.kBFavorite.create({
        data: { userId: session.user.id, documentId: docId },
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (error) {
    console.error("[KB Favorite POST] Error:", error);
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
```

**Step 3: Create favorites list route**

Create `app/api/knowledge-base/[kbId]/favorites/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kbId } = await params;

    const favorites = await prisma.kBFavorite.findMany({
      where: {
        userId: session.user.id,
        document: { knowledgeBaseId: kbId, isArchived: false },
      },
      include: {
        document: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
            folder: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      documents: favorites.map((f) => ({ ...f.document, favoritedAt: f.createdAt })),
    });
  } catch (error) {
    console.error("[KB Favorites GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add document versions and favorites API routes"
```

---

### Task 8: Search API Route

**Files:**
- Create: `app/api/knowledge-base/[kbId]/search/route.ts`

**Step 1: Create combined search route**

Create `app/api/knowledge-base/[kbId]/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";
import { getKBIndex } from "@/lib/pinecone/client";
import { generateSingleEmbedding } from "@/lib/pinecone/embeddings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });

    const { kbId } = await params;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: kbId, teamId: user?.teamId ?? "" },
    });

    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      query,
      mode = "hybrid", // "keyword" | "semantic" | "hybrid"
      folderId,
      fileTypes,
      tags,
      limit = 20,
    } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results: any[] = [];
    const seenIds = new Set<string>();

    // Tier 1: Full-text keyword search
    if (mode === "keyword" || mode === "hybrid") {
      const where: any = {
        knowledgeBaseId: kbId,
        isArchived: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: query.split(" ") } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      };

      if (folderId) where.folderId = folderId;
      if (fileTypes?.length) where.fileType = { in: fileTypes };
      if (tags?.length) where.tags = { hasSome: tags };

      const ftsResults = await prisma.kBDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });

      for (const doc of ftsResults) {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          results.push({ ...doc, searchScore: 0.8, searchType: "keyword" });
        }
      }
    }

    // Tier 2: Semantic search via Pinecone
    if (mode === "semantic" || mode === "hybrid") {
      try {
        const queryEmbedding = await generateSingleEmbedding(query);
        const index = getKBIndex();

        const filter: any = { teamId: user!.teamId! };
        if (folderId) filter.folderId = folderId;
        if (fileTypes?.length) filter.fileType = { $in: fileTypes };

        const pineconeResults = await index.namespace(user!.teamId!).query({
          vector: queryEmbedding,
          topK: limit,
          filter,
          includeMetadata: true,
        });

        if (pineconeResults.matches?.length) {
          const documentIds = pineconeResults.matches
            .map((m) => m.metadata?.documentId as string)
            .filter(Boolean)
            .filter((id) => !seenIds.has(id));

          if (documentIds.length > 0) {
            const semanticDocs = await prisma.kBDocument.findMany({
              where: {
                id: { in: documentIds },
                isArchived: false,
              },
              include: {
                uploadedBy: { select: { id: true, name: true } },
                folder: { select: { id: true, name: true } },
              },
            });

            const scoreMap = new Map(
              pineconeResults.matches.map((m) => [m.metadata?.documentId, m.score])
            );

            for (const doc of semanticDocs) {
              if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                results.push({
                  ...doc,
                  searchScore: scoreMap.get(doc.id) || 0.5,
                  searchType: "semantic",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("[KB Search] Pinecone error:", error);
        // Degrade gracefully — FTS results still returned
      }
    }

    // Sort by score descending
    results.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
      mode,
    });
  } catch (error) {
    console.error("[KB Search] Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add hybrid search API route (keyword + semantic)"
```

---

### Task 9: Project Settings API Route

**Files:**
- Create: `app/api/knowledge-base/[kbId]/projects/[projectId]/settings/route.ts`

**Step 1: Create project settings route**

Create `app/api/knowledge-base/[kbId]/projects/[projectId]/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; projectId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kbId, projectId } = await params;

    const settings = await prisma.kBProjectSettings.findFirst({
      where: { knowledgeBaseId: kbId, projectId },
      include: {
        transcriptFolder: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[KB Project Settings GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string; projectId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = getSessionCookie(cookieStore);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kbId, projectId } = await params;
    const body = await request.json();
    const { autoSaveTranscripts, transcriptFolderId } = body;

    const settings = await prisma.kBProjectSettings.upsert({
      where: { projectId },
      create: {
        projectId,
        knowledgeBaseId: kbId,
        autoSaveTranscripts: autoSaveTranscripts ?? true,
        transcriptFolderId: transcriptFolderId || null,
      },
      update: {
        ...(autoSaveTranscripts !== undefined && { autoSaveTranscripts }),
        ...(transcriptFolderId !== undefined && { transcriptFolderId }),
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[KB Project Settings PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/knowledge-base/
git commit -m "feat(kb): add project settings API route for transcript auto-save config"
```

---

## Phase 3: Background Processing

### Task 10: Inngest Functions for Document Processing

**Files:**
- Create: `lib/inngest/functions/kb-document-processing.ts`
- Modify: `lib/inngest/functions/meeting-orchestration.ts` (add transcript-to-KB step)
- Modify: Inngest serve route (register new functions)

**Step 1: Create document processing Inngest function**

Create `lib/inngest/functions/kb-document-processing.ts`:

```typescript
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { getKBIndex } from "@/lib/pinecone/client";
import { chunkText, generateEmbeddings } from "@/lib/pinecone/embeddings";

export const processKBDocument = inngest.createFunction(
  { id: "kb-process-document" },
  { event: "kb/document.process" },
  async ({ event, step }) => {
    const { documentId, teamId } = event.data;

    // Step 1: Fetch document
    const document = await step.run("fetch-document", async () => {
      return await prisma.kBDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          storageKey: true,
          fileType: true,
          mimeType: true,
          title: true,
          tags: true,
          folderId: true,
          knowledgeBaseId: true,
        },
      });
    });

    if (!document) {
      return { error: "Document not found" };
    }

    // Step 2: Extract text content
    const content = await step.run("extract-text", async () => {
      const storage = getStorageProvider();

      // For text-based files, download and read content
      if (["TEXT", "MARKDOWN"].includes(document.fileType)) {
        const buffer = await storage.download(document.storageKey);
        return buffer.toString("utf-8");
      }

      if (document.fileType === "TRANSCRIPT") {
        // Transcripts already have content stored during creation
        const doc = await prisma.kBDocument.findUnique({
          where: { id: documentId },
          select: { content: true },
        });
        return doc?.content || "";
      }

      if (document.fileType === "PDF") {
        try {
          const buffer = await storage.download(document.storageKey);
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          return parsed.text;
        } catch (e) {
          console.error("[KB Process] PDF parse error:", e);
          return "";
        }
      }

      // IMAGE and AUDIO extraction can be added later (OCR, Whisper)
      return "";
    });

    // Step 3: Save extracted content to document
    if (content) {
      await step.run("save-content", async () => {
        await prisma.kBDocument.update({
          where: { id: documentId },
          data: { content },
        });
      });
    }

    // Step 4: Generate embeddings and upsert to Pinecone
    if (content && content.trim().length > 0) {
      await step.run("generate-embeddings", async () => {
        const chunks = chunkText(content);
        const texts = chunks.map((c) => c.text);
        const embeddings = await generateEmbeddings(texts);

        const index = getKBIndex();
        const vectors = chunks.map((chunk, i) => ({
          id: `${documentId}_chunk_${chunk.index}`,
          values: embeddings[i],
          metadata: {
            documentId,
            teamId,
            folderId: document.folderId,
            knowledgeBaseId: document.knowledgeBaseId,
            fileType: document.fileType,
            title: document.title,
            tags: document.tags,
            chunkIndex: chunk.index,
            text: chunk.text.slice(0, 1000), // Store first 1000 chars for retrieval
          },
        }));

        await index.namespace(teamId).upsert(vectors);

        // Save the primary pinecone ID reference
        await prisma.kBDocument.update({
          where: { id: documentId },
          data: { pineconeId: `${documentId}_chunk_0` },
        });
      });
    }

    return { success: true, documentId, contentLength: content?.length || 0 };
  }
);

export const saveMeetingTranscriptToKB = inngest.createFunction(
  { id: "kb-save-meeting-transcript" },
  { event: "kb/meeting-transcript.save" },
  async ({ event, step }) => {
    const { meetingId, teamId, transcriptText, meetingTitle } = event.data;

    // Step 1: Find team's KB and project settings
    const config = await step.run("find-kb-config", async () => {
      const kb = await prisma.knowledgeBase.findFirst({
        where: { teamId },
      });

      if (!kb) return null;

      // Find project settings that have auto-save enabled
      const settings = await prisma.kBProjectSettings.findMany({
        where: {
          knowledgeBaseId: kb.id,
          autoSaveTranscripts: true,
        },
        include: {
          transcriptFolder: true,
        },
      });

      return { kb, settings };
    });

    if (!config?.kb || !config.settings.length) {
      return { skipped: true, reason: "No KB or auto-save not configured" };
    }

    // Step 2: Create a transcript document in the first matching KB
    const document = await step.run("create-transcript-document", async () => {
      const setting = config.settings[0];
      let folderId = setting.transcriptFolderId;

      // Auto-create Meeting Transcripts folder if not set
      if (!folderId) {
        const folder = await prisma.kBFolder.create({
          data: {
            knowledgeBaseId: config.kb.id,
            name: "Meeting Transcripts",
            type: "MEETING_TRANSCRIPTS",
            projectId: setting.projectId,
            createdById: config.kb.createdById,
          },
        });
        folderId = folder.id;

        await prisma.kBProjectSettings.update({
          where: { id: setting.id },
          data: { transcriptFolderId: folderId },
        });
      }

      const title = `${meetingTitle || "Meeting"} - ${new Date().toLocaleDateString()}`;

      // Upload transcript text to storage
      const { getStorageProvider, buildStorageKey } = await import("@/lib/storage");
      const storage = getStorageProvider();
      const storageKey = buildStorageKey(
        teamId,
        config.kb.id,
        folderId,
        `transcript-${meetingId}`,
        `${title}.txt`
      );

      const buffer = Buffer.from(transcriptText, "utf-8");
      const uploadResult = await storage.upload(storageKey, buffer, "text/plain");

      const doc = await prisma.kBDocument.create({
        data: {
          knowledgeBaseId: config.kb.id,
          folderId,
          title,
          fileType: "TRANSCRIPT",
          mimeType: "text/plain",
          fileSize: buffer.length,
          fileUrl: uploadResult.url,
          storageKey: uploadResult.key,
          content: transcriptText,
          source: "MEETING_TRANSCRIPT",
          sourceReferenceId: meetingId,
          tags: ["meeting", "transcript"],
          uploadedById: config.kb.createdById,
        },
      });

      return doc;
    });

    // Step 3: Trigger embedding generation
    await step.run("trigger-embedding", async () => {
      await inngest.send({
        name: "kb/document.process",
        data: { documentId: document.id, teamId },
      });
    });

    return { success: true, documentId: document.id };
  }
);
```

**Step 2: Find and update the Inngest serve route to register new functions**

Find the Inngest serve route file (likely `app/api/inngest/route.ts`) and add the new functions to the serve call:

```typescript
import { processKBDocument, saveMeetingTranscriptToKB } from "@/lib/inngest/functions/kb-document-processing";

// Add to the serve() functions array:
// processKBDocument, saveMeetingTranscriptToKB
```

**Step 3: Add transcript-to-KB trigger in meeting orchestration**

In `lib/inngest/functions/meeting-orchestration.ts`, inside the `processMeetingComplete` or `handleTranscriptionReady` function, add a step after transcript is saved:

```typescript
// After transcript text is available:
await step.run("trigger-kb-save", async () => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { title: true, teamId: true },
  });

  if (meeting?.teamId) {
    await inngest.send({
      name: "kb/meeting-transcript.save",
      data: {
        meetingId,
        teamId: meeting.teamId,
        transcriptText: fullTranscriptText,
        meetingTitle: meeting.title,
      },
    });
  }
});
```

**Step 4: Install pdf-parse dependency**

Run: `npm install pdf-parse`

**Step 5: Commit**

```bash
git add lib/inngest/functions/kb-document-processing.ts app/api/inngest/ lib/inngest/functions/meeting-orchestration.ts package.json package-lock.json
git commit -m "feat(kb): add Inngest functions for document processing and meeting transcript auto-save"
```

---

## Phase 4: Frontend — React Query Hooks

### Task 11: Create KB React Query Hooks

**Files:**
- Create: `hooks/useKnowledgeBase.ts`

**Step 1: Create the hooks file**

Create `hooks/useKnowledgeBase.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------- Knowledge Base ----------

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge-base");
      if (!res.ok) throw new Error("Failed to fetch knowledge bases");
      const data = await res.json();
      return data.knowledgeBases;
    },
  });
}

export function useKnowledgeBase(kbId: string | null) {
  return useQuery({
    queryKey: ["knowledge-base", kbId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge base");
      const data = await res.json();
      return data.knowledgeBase;
    },
    enabled: !!kbId,
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create knowledge base");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
  });
}

// ---------- Folders ----------

export function useKBFolders(kbId: string | null, parentFolderId?: string | null, projectId?: string) {
  return useQuery({
    queryKey: ["kb-folders", kbId, parentFolderId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (parentFolderId) params.set("parentFolderId", parentFolderId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/knowledge-base/${kbId}/folders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch folders");
      const data = await res.json();
      return data.folders;
    },
    enabled: !!kbId,
  });
}

export function useCreateKBFolder(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      parentFolderId?: string;
      projectId?: string;
      type?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-folders", kbId] });
    },
  });
}

export function useDeleteKBFolder(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/folders/${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-folders", kbId] });
    },
  });
}

// ---------- Documents ----------

export function useKBDocuments(kbId: string | null, options?: {
  folderId?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["kb-documents", kbId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.folderId) params.set("folderId", options.folderId);
      if (options?.fileType) params.set("fileType", options.fileType);
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.offset) params.set("offset", String(options.offset));
      const res = await fetch(`/api/knowledge-base/${kbId}/documents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!kbId,
  });
}

export function useKBDocument(kbId: string | null, docId: string | null) {
  return useQuery({
    queryKey: ["kb-document", kbId, docId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!kbId && !!docId,
  });
}

export function useUploadKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      file: File;
      folderId: string;
      title?: string;
      description?: string;
      tags?: string[];
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("folderId", data.folderId);
      if (data.title) formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      if (data.tags) formData.append("tags", JSON.stringify(data.tags));

      const res = await fetch(`/api/knowledge-base/${kbId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

export function useUpdateKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, ...data }: {
      docId: string;
      title?: string;
      description?: string;
      tags?: string[];
      folderId?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, vars.docId] });
    },
  });
}

export function useDeleteKBDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

// ---------- Versions ----------

export function useUploadKBVersion(kbId: string, docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; changeNote?: string }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      if (data.changeNote) formData.append("changeNote", data.changeNote);

      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}/versions`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload new version");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, docId] });
      queryClient.invalidateQueries({ queryKey: ["kb-documents", kbId] });
    },
  });
}

// ---------- Favorites ----------

export function useToggleKBFavorite(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/documents/${docId}/favorite`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: (_, docId) => {
      queryClient.invalidateQueries({ queryKey: ["kb-document", kbId, docId] });
      queryClient.invalidateQueries({ queryKey: ["kb-favorites", kbId] });
    },
  });
}

export function useKBFavorites(kbId: string | null) {
  return useQuery({
    queryKey: ["kb-favorites", kbId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/favorites`);
      if (!res.ok) throw new Error("Failed to fetch favorites");
      const data = await res.json();
      return data.documents;
    },
    enabled: !!kbId,
  });
}

// ---------- Search ----------

export function useKBSearch(kbId: string | null) {
  return useMutation({
    mutationFn: async (data: {
      query: string;
      mode?: "keyword" | "semantic" | "hybrid";
      folderId?: string;
      fileTypes?: string[];
      tags?: string[];
      limit?: number;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });
}

// ---------- Project Settings ----------

export function useKBProjectSettings(kbId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ["kb-project-settings", kbId, projectId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${kbId}/projects/${projectId}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      return data.settings;
    },
    enabled: !!kbId && !!projectId,
  });
}

export function useUpdateKBProjectSettings(kbId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      autoSaveTranscripts?: boolean;
      transcriptFolderId?: string;
    }) => {
      const res = await fetch(`/api/knowledge-base/${kbId}/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-project-settings", kbId, projectId] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add hooks/useKnowledgeBase.ts
git commit -m "feat(kb): add React Query hooks for knowledge base operations"
```

---

## Phase 5: Frontend — Pages & Components

### Task 12: Add KB to Sidebar Navigation

**Files:**
- Modify: `components/layout/AppSidebar.tsx`

**Step 1: Add the Knowledge Base navigation item**

In `components/layout/AppSidebar.tsx`, add `BookOpen` to the lucide-react imports, then add to the navigation array after the CRM entry:

```typescript
{ name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
```

**Step 2: Commit**

```bash
git add components/layout/AppSidebar.tsx
git commit -m "feat(kb): add Knowledge Base to sidebar navigation"
```

---

### Task 13: Create KB Overview Page

**Files:**
- Create: `app/(app)/knowledge-base/page.tsx`

**Step 1: Create the main KB page**

Create `app/(app)/knowledge-base/page.tsx` following the vendor dashboard pattern:

The page should display:
- Header with "Knowledge Base" title + "New KB" button
- Stats cards (total documents, total folders, recent uploads)
- Recent documents grid
- Favorites section
- Search bar at top
- List of projects with KB enabled (linking to `/knowledge-base/[projectId]`)

Use the same component patterns as the vendor dashboard:
- `useKnowledgeBases()` hook for data
- `Card`, `CardHeader`, `CardContent` from `@/components/ui/card`
- `Button` from `@/components/ui/button`
- Loading skeleton and empty state patterns
- `BookOpen`, `FolderOpen`, `FileText`, `Star`, `Search`, `Plus` from lucide-react

**Step 2: Commit**

```bash
git add app/(app)/knowledge-base/
git commit -m "feat(kb): add Knowledge Base overview page"
```

---

### Task 14: Create KB Upload Zone Component

**Files:**
- Create: `components/knowledge-base/KBUploadZone.tsx`

**Step 1: Create the upload component**

Create a drag-and-drop upload zone component:

```typescript
"use client";

import { useCallback, useState } from "react";
import { useUploadKBDocument } from "@/hooks/useKnowledgeBase";
import { Upload, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KBUploadZoneProps {
  kbId: string;
  folderId: string;
  onUploadComplete?: () => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "text/plain", "text/markdown",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
];

export function KBUploadZone({ kbId, folderId, onUploadComplete }: KBUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const uploadMutation = useUploadKBDocument(kbId);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    for (const file of pendingFiles) {
      try {
        await uploadMutation.mutateAsync({ file, folderId, title: file.name });
        toast.success(`Uploaded: ${file.name}`);
      } catch {
        toast.error(`Failed to upload: ${file.name}`);
      }
    }
    setPendingFiles([]);
    onUploadComplete?.();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        )}
        onClick={() => document.getElementById("kb-file-input")?.click()}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, Images, Markdown, Text, Audio (max 50MB)
        </p>
        <input
          id="kb-file-input"
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{file.name}</span>
              <span className="text-xs text-gray-400">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button
            onClick={uploadAll}
            disabled={uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <>Upload {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/knowledge-base/
git commit -m "feat(kb): add drag-and-drop upload zone component"
```

---

### Task 15: Create KB Document Grid Component

**Files:**
- Create: `components/knowledge-base/KBDocumentGrid.tsx`

**Step 1: Create the document grid/list component**

This component displays documents as a grid of cards with thumbnails, file type icons, metadata (title, size, date, uploader). Each card is clickable and links to the document detail page. Include a star/favorite toggle button on each card. Use the file type to show an appropriate icon (FileText for text/md, Image for images, FileAudio for audio, etc. from lucide-react).

Follow the vendor list card patterns for the grid layout.

**Step 2: Commit**

```bash
git add components/knowledge-base/KBDocumentGrid.tsx
git commit -m "feat(kb): add document grid component with thumbnails and metadata"
```

---

### Task 16: Create KB Folder Sidebar Component

**Files:**
- Create: `components/knowledge-base/KBFolderSidebar.tsx`

**Step 1: Create the collapsible folder tree sidebar**

A recursive tree component that renders nested folders. Each folder shows its name, document count, and expand/collapse toggle. Clicking a folder navigates to its contents. Include a "New Folder" button and context menu (rename/delete) per folder. Use `ChevronRight`, `ChevronDown`, `Folder`, `FolderOpen` from lucide-react.

**Step 2: Commit**

```bash
git add components/knowledge-base/KBFolderSidebar.tsx
git commit -m "feat(kb): add folder sidebar tree navigation component"
```

---

### Task 17: Create KB Search Bar Component

**Files:**
- Create: `components/knowledge-base/KBSearchBar.tsx`

**Step 1: Create the search component**

A search bar with:
- Text input with search icon
- Mode toggle (Keyword / Semantic / Hybrid) using radio buttons or segmented control
- Optional file type filter dropdown
- Results displayed below in a dropdown panel with document cards
- Debounced search (300ms) using `useKBSearch` mutation

**Step 2: Commit**

```bash
git add components/knowledge-base/KBSearchBar.tsx
git commit -m "feat(kb): add search bar with keyword/semantic/hybrid modes"
```

---

### Task 18: Create KB Document Preview Page

**Files:**
- Create: `app/(app)/knowledge-base/[kbId]/documents/[docId]/page.tsx`

**Step 1: Create the document detail/preview page**

The page should display:
- Document title, description, tags, metadata
- Favorite toggle button
- Download button (using signed URL)
- Inline preview based on file type:
  - PDF: iframe or react-pdf
  - Image: `<img>` with zoom capability
  - Markdown: rendered via `react-markdown` (already in stack)
  - Text: monospace `<pre>` block
  - Audio: HTML5 `<audio>` player
  - Transcript: formatted with speaker labels
- Version history sidebar showing all versions with dates and change notes
- "Upload New Version" button that opens the version upload form
- Breadcrumb navigation (KB > Project > Folder > Document)

**Step 2: Install react-pdf dependency**

Run: `npm install react-pdf`

**Step 3: Commit**

```bash
git add app/(app)/knowledge-base/ package.json package-lock.json
git commit -m "feat(kb): add document detail and preview page"
```

---

### Task 19: Create Project KB Page with Folder View

**Files:**
- Create: `app/(app)/knowledge-base/[kbId]/page.tsx`
- Create: `app/(app)/knowledge-base/[kbId]/folders/[folderId]/page.tsx`

**Step 1: Create the KB detail page**

Layout with:
- Left sidebar: `KBFolderSidebar` showing folder tree
- Main content: `KBDocumentGrid` showing documents in selected folder
- Top: `KBSearchBar` + breadcrumb
- Upload zone at bottom or as a floating action button
- Project settings toggle (auto-save transcripts) if viewing a project folder

**Step 2: Create folder contents page**

Same layout as KB detail but filtered to show documents in the specific folder. Reuses the same components.

**Step 3: Commit**

```bash
git add app/(app)/knowledge-base/
git commit -m "feat(kb): add KB detail and folder contents pages"
```

---

## Phase 6: Integration & Polish

### Task 20: Wire Up Meeting Transcript Auto-Save

**Files:**
- Modify: `lib/inngest/functions/meeting-orchestration.ts`

**Step 1: Add KB trigger to meeting completion flow**

Find the function that handles meeting completion / transcription ready. Add a final step that sends the `kb/meeting-transcript.save` event with the meeting ID, team ID, transcript text, and meeting title.

**Step 2: Test the integration**

Verify the Inngest function chain:
1. Meeting ends → transcript fetched → `kb/meeting-transcript.save` event sent
2. KB function creates document in Meeting Transcripts folder
3. Processing function extracts content and generates embeddings

**Step 3: Commit**

```bash
git add lib/inngest/functions/meeting-orchestration.ts
git commit -m "feat(kb): wire up meeting transcript auto-save to KB pipeline"
```

---

### Task 21: Add KB Stats to Dashboard / Command Center

**Files:**
- Create: `app/api/knowledge-base/stats/route.ts`

**Step 1: Create a stats API endpoint**

Returns: total documents, total storage used, documents by type, recent uploads, documents by source (upload vs transcript vs AI).

**Step 2: Optionally add a KB signal to Command Center**

Add a signal type for "New documents added to KB" or "Meeting transcript saved to KB" to keep teams informed.

**Step 3: Commit**

```bash
git add app/api/knowledge-base/stats/ components/
git commit -m "feat(kb): add KB stats API and optional command center signal"
```

---

### Task 22: Environment Variables & Final Configuration

**Files:**
- Modify: `.env.example` or `.env.local` (add new vars)

**Step 1: Add required environment variables**

```
# Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-base

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=aya-knowledge-base

# Storage Provider
STORAGE_PROVIDER=supabase
```

**Step 2: Create Supabase storage bucket**

In the Supabase dashboard, create a storage bucket named `knowledge-base` with:
- Public access: off (use signed URLs)
- File size limit: 50MB
- Allowed MIME types: pdf, images, text, markdown, audio

**Step 3: Create Pinecone index**

In the Pinecone dashboard, create an index named `aya-knowledge-base` with:
- Dimensions: 1536 (for text-embedding-3-small)
- Metric: cosine
- Cloud: AWS (or your preferred provider)

**Step 4: Commit**

```bash
git add .env.example
git commit -m "feat(kb): add environment variable configuration for storage and vector search"
```

---

## Task Summary

| Phase | Task | Description |
|-------|------|-------------|
| 1 | Task 1 | Prisma schema — KB models and enums |
| 1 | Task 2 | Storage provider abstraction + Supabase implementation |
| 1 | Task 3 | Pinecone client + embeddings utility |
| 2 | Task 4 | KB CRUD API routes |
| 2 | Task 5 | Folder CRUD API routes |
| 2 | Task 6 | Document upload + CRUD API routes |
| 2 | Task 7 | Document versions + favorites API routes |
| 2 | Task 8 | Search API route (keyword + semantic + hybrid) |
| 2 | Task 9 | Project settings API route |
| 3 | Task 10 | Inngest functions — document processing + transcript save |
| 4 | Task 11 | React Query hooks for all KB operations |
| 5 | Task 12 | Add KB to sidebar navigation |
| 5 | Task 13 | KB overview page |
| 5 | Task 14 | Upload zone component |
| 5 | Task 15 | Document grid component |
| 5 | Task 16 | Folder sidebar component |
| 5 | Task 17 | Search bar component |
| 5 | Task 18 | Document preview page |
| 5 | Task 19 | Project KB + folder contents pages |
| 6 | Task 20 | Wire meeting transcript auto-save |
| 6 | Task 21 | KB stats API + command center signal |
| 6 | Task 22 | Environment variables + external service setup |
