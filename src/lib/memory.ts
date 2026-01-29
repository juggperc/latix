import { db } from "./db";
import { memories } from "./schema";
import { eq, asc, count } from "drizzle-orm";

const MAX_MEMORIES_PER_USER = 500;

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

function simpleEmbed(text: string, dim = 256): number[] {
  const vec = new Float64Array(dim);
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const idx = ((hash % dim) + dim) % dim;
    vec[idx] += 1;
  }
  let mag = 0;
  for (let i = 0; i < dim; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag) || 1;
  const result: number[] = [];
  for (let i = 0; i < dim; i++) result.push(vec[i] / mag);
  return result;
}

export async function addMemory(userId: string, content: string, type = "general"): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(memories).where(eq(memories.userId, userId));
  if (cnt >= MAX_MEMORIES_PER_USER) {
    const [oldest] = await db.select().from(memories).where(eq(memories.userId, userId)).orderBy(asc(memories.createdAt)).limit(1);
    if (oldest) await db.delete(memories).where(eq(memories.id, oldest.id));
  }

  const embedding = simpleEmbed(content);
  await db.insert(memories).values({
    userId,
    content,
    type,
    embedding: JSON.stringify(embedding),
  });
}

export async function searchMemories(userId: string, query: string, limit = 5) {
  const queryVec = simpleEmbed(query);
  const allMems = await db.select().from(memories).where(eq(memories.userId, userId));

  return allMems
    .filter((m) => m.embedding)
    .map((m) => ({
      content: m.content,
      type: m.type,
      score: cosineSim(queryVec, JSON.parse(m.embedding!)),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((m) => m.score > 0.1)
    .slice(0, limit);
}

export function extractMemorableContent(userMessage: string): string[] {
  const mems: string[] = [];
  const patterns = [
    /(?:i (?:like|love|prefer|enjoy|hate|dislike|want|need|use|work with|am|live))\s+(.+)/gi,
    /(?:my (?:name|job|role|company|project|stack|language|framework))\s+(?:is|are)\s+(.+)/gi,
    /(?:please (?:remember|note|keep in mind))\s+(.+)/gi,
    /(?:call me)\s+(.+)/gi,
  ];
  for (const pat of patterns) {
    for (const match of userMessage.matchAll(pat)) {
      mems.push(`User stated: ${match[0].trim()}`);
    }
  }
  return mems;
}
