import { db } from "./db";
import { users, creditLedger } from "./schema";
import { eq } from "drizzle-orm";

export async function debitCredits(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  if (amount <= 0) return true;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.credits < amount) return false;

  const newBalance = user.credits - amount;
  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));
  await db.insert(creditLedger).values({
    userId,
    amount: -amount,
    balance: newBalance,
    description,
  });
  return true;
}

export async function creditAccount(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const newBalance = user.credits + amount;
  await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));
  await db.insert(creditLedger).values({
    userId,
    amount,
    balance: newBalance,
    description,
  });
}
