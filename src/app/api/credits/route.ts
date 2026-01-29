import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1);
  const [sub] = await db.select({ plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

  return NextResponse.json({
    credits: user?.credits ?? 0,
    plan: sub?.plan ?? "free",
    status: sub?.status ?? "active",
  });
}
