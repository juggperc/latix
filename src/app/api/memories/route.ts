import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { memories } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { addMemory, searchMemories } from "@/lib/memory";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (query) {
    const results = await searchMemories(userId, query);
    return NextResponse.json(results);
  }

  const mems = await db.select({
    id: memories.id,
    type: memories.type,
    content: memories.content,
    createdAt: memories.createdAt,
  }).from(memories).where(eq(memories.userId, userId)).orderBy(desc(memories.createdAt)).limit(50);

  return NextResponse.json(mems);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { content, type } = await req.json();

  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "Content required (max 2000 chars)" }, { status: 400 });
  }

  await addMemory(userId, content, type || "general");
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { id } = await req.json();

  const [memory] = await db.select().from(memories).where(and(eq(memories.id, id), eq(memories.userId, userId))).limit(1);
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Bug #6 fix: Scope delete to userId for defense-in-depth
  await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, userId)));
  return NextResponse.json({ ok: true });
}
