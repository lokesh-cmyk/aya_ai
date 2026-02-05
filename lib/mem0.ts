/**
 * Mem0 API Client
 * Provides long-term memory capabilities for the AYA AI assistant
 * @see https://docs.mem0.ai/api-reference
 */

const MEM0_API_URL = 'https://api.mem0.ai';

// Types
export interface Mem0Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Memory {
  id: string;
  memory: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  categories?: string[];
  immutable?: boolean;
  expiration_date?: string;
}

export interface AddMemoryResponse {
  id: string;
  event: 'ADD' | 'UPDATE' | 'DELETE';
  data: {
    memory: string;
  };
}

export interface MemoryHistoryEntry {
  id: string;
  memory_id: string;
  input: Mem0Message[];
  old_memory: string | null;
  new_memory: string;
  user_id: string;
  event: 'ADD' | 'UPDATE' | 'DELETE';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Helper to get API key
function getApiKey(): string {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    throw new Error('MEM0_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Helper for API requests
async function mem0Request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${MEM0_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mem0 API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Add memories from a conversation
 * Mem0 will automatically extract and store relevant facts
 */
export async function addMemory(
  userId: string,
  messages: Mem0Message[],
  metadata?: Record<string, any>
): Promise<AddMemoryResponse[]> {
  return mem0Request<AddMemoryResponse[]>('/v1/memories/', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      messages,
      metadata,
      infer: true, // Let mem0 extract memories automatically
      output_format: 'v1.1',
    }),
  });
}

/**
 * Search for relevant memories based on a query
 * Uses semantic search to find contextually relevant memories
 */
export async function searchMemories(
  userId: string,
  query: string,
  options?: {
    top_k?: number;
    threshold?: number;
    rerank?: boolean;
  }
): Promise<Memory[]> {
  const { top_k = 5, threshold = 0.3, rerank = false } = options || {};

  return mem0Request<Memory[]>('/v2/memories/search/', {
    method: 'POST',
    body: JSON.stringify({
      query,
      filters: {
        AND: [{ user_id: userId }],
      },
      top_k,
      threshold,
      rerank,
    }),
  });
}

/**
 * Get all memories for a user
 * Supports pagination
 */
export async function getMemories(
  userId: string,
  options?: {
    page?: number;
    page_size?: number;
  }
): Promise<Memory[]> {
  const { page = 1, page_size = 100 } = options || {};

  return mem0Request<Memory[]>('/v2/memories/', {
    method: 'POST',
    body: JSON.stringify({
      filters: {
        AND: [{ user_id: userId }],
      },
      page,
      page_size,
    }),
  });
}

/**
 * Update a specific memory
 */
export async function updateMemory(
  memoryId: string,
  text: string,
  metadata?: Record<string, any>
): Promise<Memory> {
  return mem0Request<Memory>(`/v1/memories/${memoryId}/`, {
    method: 'PUT',
    body: JSON.stringify({
      text,
      metadata,
    }),
  });
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  await mem0Request<void>(`/v1/memories/${memoryId}/`, {
    method: 'DELETE',
  });
}

/**
 * Get the history of changes for a specific memory
 */
export async function getMemoryHistory(
  memoryId: string
): Promise<MemoryHistoryEntry[]> {
  return mem0Request<MemoryHistoryEntry[]>(`/v1/memories/${memoryId}/history/`);
}

/**
 * Batch update multiple memories
 */
export async function batchUpdateMemories(
  memories: Array<{ memory_id: string; text: string; metadata?: Record<string, any> }>
): Promise<Memory[]> {
  return mem0Request<Memory[]>('/v1/memories/batch/', {
    method: 'PUT',
    body: JSON.stringify({ memories }),
  });
}

/**
 * Store memory asynchronously (fire and forget)
 * Used after generating AI responses to not block the response stream
 */
export function storeMemoryAsync(
  userId: string,
  messages: Mem0Message[],
  metadata?: Record<string, any>
): void {
  // Fire and forget - don't await
  addMemory(userId, messages, metadata).catch((error) => {
    console.error('[mem0] Failed to store memory:', error);
  });
}

/**
 * Check if mem0 is configured
 */
export function isMem0Configured(): boolean {
  return !!process.env.MEM0_API_KEY;
}
