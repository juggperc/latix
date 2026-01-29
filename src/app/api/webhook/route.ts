import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { creditAccount } from "@/lib/credits";
import { PLANS } from "@/lib/models";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const type = event.type as string;
  const data = event.data as Record<string, unknown>;
  const object = data?.object as Record<string, unknown>;

  switch (type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const customerId = object.customer as string;
      const status = object.status as string;
      const periodEnd = new Date((object.current_period_end as number) * 1000);

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).limit(1);
      if (sub) {
        await db.update(subscriptions).set({
          status: status === "active" ? "active" : "inactive",
          currentPeriodEnd: periodEnd.toISOString(),
          plan: "pro",
          monthlyCredits: PLANS.pro.monthlyCredits,
        }).where(eq(subscriptions.id, sub.id));
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const customerId = object.customer as string;
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).limit(1);
      if (sub) {
        await creditAccount(sub.userId, PLANS.pro.monthlyCredits, "Monthly subscription credit top-up");
      }
      break;
    }

    case "customer.subscription.deleted": {
      const customerId = object.customer as string;
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).limit(1);
      if (sub) {
        await db.update(subscriptions).set({
          status: "cancelled",
          plan: "free",
          monthlyCredits: 0,
        }).where(eq(subscriptions.id, sub.id));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
