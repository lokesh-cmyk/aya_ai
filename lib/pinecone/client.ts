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
