import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const convs = await db.select({
    id: conversations.id,
    title: conversations.title,
    updatedAt: conversations.updatedAt,
  }).from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt)).limit(50);

  return NextResponse.json(convs);
}
