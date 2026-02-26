# Unified Knowledge Base System — Design Document

**Date:** 2026-02-26
**Status:** Approved
**Author:** Aya Development Team

## Overview

A unified Knowledge Base (KB) system inside Aya that allows teams to store, organize, and retrieve documents, files, meeting transcripts, and other information across projects. The KB supports multiple file types (PDF, images, markdown, text, audio, transcripts), provides both keyword and semantic search, and integrates with Aya's meeting bot for automatic transcript ingestion.

## Requirements Summary

- **Scope:** Per-team KB with per-project folders
- **File Storage:** Supabase Storage (with provider abstraction for future S3/Azure migration)
- **Search:** Full-text PostgreSQL search + Pinecone semantic/vector search
- **Meeting Integration:** Auto-save transcripts with configurable toggle per project
- **Access Control:** Team + project level (uses existing RBAC roles)
- **Editing:** Upload & read only for V1 (no collaborative editing)
- **Versioning:** Document version history
- **Favorites:** Users can pin/favorite documents for quick access

## Architecture: Hybrid Approach

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  /knowledge-base → KB Overview                   │
│  /knowledge-base/[projectId] → Project KB        │
│  /knowledge-base/[projectId]/[folderId]          │
│  /knowledge-base/[projectId]/[documentId]        │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│                API Layer (Next.js API Routes)    │
│  /api/knowledge-base/*                           │
└──┬──────────────┬─────────────────┬─────────────┘
   │              │                 │
   ▼              ▼                 ▼
┌────────┐  ┌───────────┐  ┌──────────────┐
│ Neon   │  │ Supabase  │  │  Pinecone    │
│ Prisma │  │ Storage   │  │  (Vectors)   │
│        │  │ (Files)   │  │              │
│Metadata│  │ PDF,IMG,  │  │ Embeddings   │
│Folders │  │ Audio,etc │  │ Semantic     │
│FTS     │  │           │  │ Search       │
└────────┘  └───────────┘  └──────────────┘
               │
        ┌──────┴───────┐
        │  Provider     │
        │  Abstraction  │
        │  Layer        │
        │              │
        │  Future:     │
        │  - AWS S3    │
        │  - Azure Blob│
        └──────────────┘

┌──────────────────────────────────────────────────┐
│              Inngest (Background Jobs)            │
│  - Text extraction from uploaded files            │
│  - Embedding generation → Pinecone               │
│  - Meeting transcript auto-save to KB            │
│  - Re-indexing jobs                              │
└──────────────────────────────────────────────────┘
```

## Data Model

### KnowledgeBase (per-team KB container)

| Field         | Type     | Description                          |
|---------------|----------|--------------------------------------|
| id            | String   | cuid primary key                     |
| teamId        | String   | FK → Team                            |
| name          | String   | KB display name                      |
| description   | String?  | Optional description                 |
| createdById   | String   | FK → User                            |
| createdAt     | DateTime | Auto-set                             |
| updatedAt     | DateTime | Auto-updated                         |

### KBFolder (hierarchical folders)

| Field            | Type     | Description                                    |
|------------------|----------|------------------------------------------------|
| id               | String   | cuid primary key                               |
| knowledgeBaseId  | String   | FK → KnowledgeBase                             |
| parentFolderId   | String?  | FK → KBFolder (self-referential for nesting)   |
| name             | String   | Folder display name                            |
| description      | String?  | Optional description                           |
| type             | Enum     | GENERAL, MEETING_TRANSCRIPTS, UPLOADS          |
| projectId        | String?  | FK → Space (links to CRM project)              |
| createdById      | String   | FK → User                                      |
| createdAt        | DateTime | Auto-set                                       |
| updatedAt        | DateTime | Auto-updated                                   |

### KBDocument (individual files/documents)

| Field              | Type     | Description                                      |
|--------------------|----------|--------------------------------------------------|
| id                 | String   | cuid primary key                                 |
| folderId           | String   | FK → KBFolder                                    |
| knowledgeBaseId    | String   | FK → KnowledgeBase                               |
| title              | String   | Document title                                   |
| description        | String?  | Optional description                             |
| fileType           | Enum     | PDF, IMAGE, MARKDOWN, TEXT, AUDIO, TRANSCRIPT, OTHER |
| mimeType           | String   | MIME type (e.g., application/pdf)                |
| fileSize           | Int      | Size in bytes                                    |
| fileUrl            | String   | Current storage URL                              |
| storageKey         | String   | Provider-agnostic storage key                    |
| content            | String?  | Extracted text content for FTS                   |
| pineconeId         | String?  | Reference to Pinecone vector                     |
| source             | Enum     | UPLOAD, MEETING_TRANSCRIPT, AI_GENERATED, INTEGRATION |
| sourceReferenceId  | String?  | e.g., meetingId for transcripts                  |
| tags               | String[] | User-defined tags                                |
| metadata           | Json?    | Flexible extra data                              |
| isArchived         | Boolean  | Soft delete flag (default false)                 |
| currentVersion     | Int      | Current version number (default 1)               |
| uploadedById       | String   | FK → User                                        |
| createdAt          | DateTime | Auto-set                                         |
| updatedAt          | DateTime | Auto-updated                                     |

### KBDocumentVersion (version history)

| Field         | Type     | Description                          |
|---------------|----------|--------------------------------------|
| id            | String   | cuid primary key                     |
| documentId    | String   | FK → KBDocument                      |
| versionNumber | Int      | Sequential version number            |
| fileUrl       | String   | Storage URL for this version         |
| storageKey    | String   | Storage key for this version         |
| fileSize      | Int      | Size in bytes                        |
| content       | String?  | Extracted text for this version      |
| pineconeId    | String?  | Embedding for this version           |
| changeNote    | String?  | Optional change description          |
| uploadedById  | String   | FK → User                            |
| createdAt     | DateTime | Auto-set                             |

### KBFavorite (user bookmarks)

| Field      | Type     | Description                          |
|------------|----------|--------------------------------------|
| id         | String   | cuid primary key                     |
| userId     | String   | FK → User                            |
| documentId | String   | FK → KBDocument                      |
| createdAt  | DateTime | Auto-set                             |

Unique constraint: (userId, documentId)

### KBProjectSettings (per-project KB config)

| Field               | Type     | Description                          |
|---------------------|----------|--------------------------------------|
| id                  | String   | cuid primary key                     |
| projectId           | String   | FK → Space (CRM project)            |
| knowledgeBaseId     | String   | FK → KnowledgeBase                   |
| autoSaveTranscripts | Boolean  | Default true                         |
| transcriptFolderId  | String?  | FK → KBFolder (target folder)       |
| createdAt           | DateTime | Auto-set                             |
| updatedAt           | DateTime | Auto-updated                         |

## Storage Provider Abstraction

```typescript
// lib/storage/types.ts
interface StorageProvider {
  upload(key: string, file: Buffer, contentType: string): Promise<{ url: string; key: string }>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  getPublicUrl(key: string): string
}
```

**Storage key format:** `kb/{teamId}/{knowledgeBaseId}/{folderId}/{documentId}/{filename}`

**V1 Implementation:** Supabase Storage (`lib/storage/supabase-provider.ts`)
**Future:** AWS S3 (`lib/storage/s3-provider.ts`), Azure Blob (`lib/storage/azure-provider.ts`)

**Factory:** `lib/storage/index.ts` reads `STORAGE_PROVIDER` env var and returns the correct provider instance.

## Search Architecture

### Tier 1: Full-Text Search (PostgreSQL)

- `content` field on KBDocument stores extracted text from uploaded files
- PostgreSQL `tsvector` column (`searchVector`) auto-generated from content + title + tags
- Used for keyword/exact match queries
- Fast, free, no external dependency

### Tier 2: Semantic Search (Pinecone)

- When a document is uploaded/updated, an Inngest background job:
  1. Extracts text content from the file
  2. Chunks content (1000 tokens per chunk, 200 token overlap)
  3. Generates embeddings via OpenAI `text-embedding-3-small`
  4. Upserts to Pinecone with metadata: `{ documentId, folderId, teamId, tags, fileType }`
- Search: embed query → Pinecone similarity search → fetch matching docs from Prisma
- **Namespace:** One Pinecone namespace per team for data isolation

### Combined Search API

```
POST /api/knowledge-base/search
Body: { query, teamId, projectId?, folderId?, fileTypes?, tags?, mode: "keyword" | "semantic" | "hybrid" }

Hybrid mode: runs FTS and Pinecone in parallel, merges results, deduplicates, ranks by combined score
```

### Text Extraction Pipeline (Inngest)

| File Type  | Extraction Method                        |
|------------|------------------------------------------|
| PDF        | pdf-parse library                        |
| Markdown   | Direct read (already text)               |
| Text       | Direct read                              |
| Image      | OCR via Tesseract.js or cloud OCR API    |
| Audio      | Whisper transcription (OpenAI)           |
| Transcript | Already structured text from MeetingBaas |

## Meeting Transcript Integration

### Flow

1. Meeting ends → MeetingBaas webhook → existing `meeting-orchestration` Inngest function fetches transcript
2. **New step in orchestration:** After transcript saved to `MeetingTranscript` table:
   - Look up meeting's project → check `KBProjectSettings.autoSaveTranscripts`
   - If enabled: create `KBDocument` with `source: MEETING_TRANSCRIPT`, `sourceReferenceId: meetingId`
   - Upload transcript text to Supabase Storage
   - Queue embedding generation
3. If auto-save is disabled: create a notification for the user to manually decide

### Auto-created folder structure

When a project enables KB and auto-save transcripts:
- A "Meeting Transcripts" folder (`type: MEETING_TRANSCRIPTS`) is auto-created in the project's KB
- Transcripts are named: `{Meeting Title} - {Date}` (e.g., "Sprint Planning - 2026-02-26")

## UI Design

### Navigation

Add "Knowledge Base" to `AppSidebar` between CRM and Vendors.

### Pages

| Route                                          | Purpose                                    |
|------------------------------------------------|--------------------------------------------|
| `/knowledge-base`                              | Team KB overview, recent docs, search      |
| `/knowledge-base/[projectId]`                  | Project KB with folder tree + doc grid     |
| `/knowledge-base/[projectId]/[folderId]`       | Folder contents                            |
| `/knowledge-base/[projectId]/[documentId]`     | Document detail/preview                    |

### Key Components

| Component            | Description                                        |
|----------------------|----------------------------------------------------|
| `KBSidebar`          | Folder tree navigation (collapsible, nested)       |
| `KBDocumentGrid`     | Grid/list view with thumbnails and metadata        |
| `KBUploadZone`       | Drag-and-drop multi-file upload area               |
| `KBSearchBar`        | Unified search with keyword/semantic toggle        |
| `KBDocumentPreview`  | Inline preview (PDF, images, markdown, text, audio)|
| `KBFavorites`        | Quick access panel for pinned documents            |
| `KBVersionHistory`   | Version timeline sidebar for document              |
| `KBBreadcrumb`       | Navigation breadcrumb (Team > Project > Folder)    |

### Document Preview Strategy

| Type       | Renderer                            |
|------------|-------------------------------------|
| PDF        | `react-pdf` or iframe               |
| Image      | Native `<img>` with zoom controls   |
| Markdown   | `react-markdown` (already in stack) |
| Text       | Monospace pre-formatted view        |
| Audio      | HTML5 `<audio>` player              |
| Transcript | Custom view with speaker labels     |

## API Routes

```
/api/knowledge-base
  GET    /                          → List team's KBs
  POST   /                          → Create KB (auto on team creation)

/api/knowledge-base/[kbId]
  GET    /folders                    → List folders
  POST   /folders                    → Create folder
  PATCH  /folders/[folderId]         → Update folder
  DELETE /folders/[folderId]         → Delete folder

  GET    /documents                  → List documents (with filters)
  POST   /documents                  → Upload document(s)
  GET    /documents/[docId]          → Get document detail
  PATCH  /documents/[docId]          → Update document metadata
  DELETE /documents/[docId]          → Archive document

  POST   /documents/[docId]/versions → Upload new version
  GET    /documents/[docId]/versions → List versions

  POST   /documents/[docId]/favorite → Toggle favorite
  GET    /favorites                  → List user's favorites

  POST   /search                     → Search documents (keyword/semantic/hybrid)

  GET    /projects/[projectId]/settings    → Get project KB settings
  PATCH  /projects/[projectId]/settings    → Update settings (auto-save toggle)

/api/knowledge-base/upload
  POST   /presigned-url              → Get presigned upload URL from storage provider
```

## Background Jobs (Inngest)

| Function                    | Trigger                          | Action                                    |
|-----------------------------|----------------------------------|-------------------------------------------|
| `kb-process-document`       | Document uploaded                | Extract text, generate embedding, index   |
| `kb-reindex-document`       | Document updated/new version     | Re-extract, re-embed, update Pinecone     |
| `kb-save-meeting-transcript`| Meeting transcript ready         | Auto-save to project KB if enabled        |
| `kb-bulk-reindex`           | Manual trigger                   | Reindex all documents (admin operation)   |

## Environment Variables

```
# Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=knowledge-base

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=aya-knowledge-base
PINECONE_ENVIRONMENT=

# Storage Provider (for abstraction layer)
STORAGE_PROVIDER=supabase  # supabase | s3 | azure

# OpenAI (for embeddings — already configured for AI chat)
OPENAI_API_KEY=  # already exists
```

## Migration Path (Supabase → S3/Azure)

1. Implement new provider adapter (e.g., `s3-provider.ts`)
2. Write a one-time migration script that:
   - Lists all `storageKey` values from KBDocument + KBDocumentVersion
   - Copies files from Supabase to new provider using the same key structure
   - Updates `fileUrl` fields to new provider URLs
3. Change `STORAGE_PROVIDER` env var
4. Deploy — zero code changes in application logic

## Security

- All KB operations require authenticated session (Better Auth)
- Team membership check on every API call
- Project access validated via team membership + role
- Signed URLs for file downloads (time-limited)
- File type validation on upload (whitelist allowed MIME types)
- File size limits (configurable, default 50MB per file)
- Pinecone namespaced by teamId for data isolation
