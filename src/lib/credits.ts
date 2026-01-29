import { db } from "./db";
import { users, creditLedger } from "./schema";
import { eq, sql } from "drizzle-orm";

export async function debitCredits(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  if (amount <= 0) return true;

  // Atomic: only debit if sufficient balance, prevents race conditions
  const result = await db
    .update(users)
    .set({ credits: sql`credits - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.credits} >= ${amount}`);

  if (result.changes === 0) return false;

  const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1);
  await db.insert(creditLedger).values({
    userId,
    amount: -amount,
    balance: user?.credits ?? 0,
    description,
  });
  return true;
}

export async function creditAccount(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  const result = await db
    .update(users)
    .set({ credits: sql`credits + ${amount}` })
    .where(eq(users.id, userId));

  if (result.changes === 0) throw new Error("User not found");

  const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1);
  await db.insert(creditLedger).values({
    userId,
    amount,
    balance: user?.credits ?? 0,
    description,
  });
}
