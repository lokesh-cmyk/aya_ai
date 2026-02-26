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
  const host = process.env.PINECONE_HOST;

  // Pinecone SDK v7 requires the host URL to connect directly to the index
  if (host) {
    return client.index(indexName, host);
  }
  return client.index(indexName);
}
