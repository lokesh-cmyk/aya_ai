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
