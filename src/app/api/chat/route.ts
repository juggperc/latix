import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, conversations, messages as messagesTable } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getModel, calculateCost, DEFAULT_MODEL } from "@/lib/models";
import { debitCredits } from "@/lib/credits";
import { searchMemories, addMemory, extractMemorableContent } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const { messages, conversationId, modelId } = await req.json();

  const selectedModelId = modelId || DEFAULT_MODEL;
  const model = getModel(selectedModelId);
  if (!model) {
    return new Response("Invalid model", { status: 400 });
  }

  if (!model.free) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.credits <= 0) {
      return new Response("Insufficient credits", { status: 402 });
    }
  }

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  let memoryContext = "";
  if (lastUserMsg) {
    const relevantMemories = await searchMemories(userId, lastUserMsg.content, 5);
    if (relevantMemories.length > 0) {
      memoryContext =
        "\n\n[Recalled memories about this user]\n" +
        relevantMemories.map((m) => `- (${m.type}) ${m.content}`).join("\n") +
        "\n[End memories]\n";
    }
  }

  const systemMessage = {
    role: "system",
    content: `You are Latix, a helpful AI assistant. Be concise and helpful.${memoryContext}`,
  };

  let convId = conversationId;
  if (!convId) {
    const [conv] = await db.insert(conversations).values({
      userId,
      title: lastUserMsg?.content?.slice(0, 50) || "New Chat",
    }).returning();
    convId = conv.id;
  }

  if (lastUserMsg) {
    await db.insert(messagesTable).values({
      conversationId: convId,
      role: "user",
      content: lastUserMsg.content,
    });
  }

  const fullApiMessages = [systemMessage, ...messages];

  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Latix",
    },
    body: JSON.stringify({
      model: selectedModelId,
      messages: fullApiMessages,
      stream: true,
      max_tokens: model.maxTokens,
    }),
  });

  if (!openRouterRes.ok) {
    const errText = await openRouterRes.text();
    console.error("OpenRouter error:", errText);
    return new Response("AI service error", { status: 502 });
  }

  // Bug #9 fix: Guard against null body
  if (!openRouterRes.body) {
    return new Response("Empty response from AI service", { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content, conversationId: convId })}\n\n`)
                );
              }
              if (parsed.usage) {
                inputTokens = parsed.usage.prompt_tokens || 0;
                outputTokens = parsed.usage.completion_tokens || 0;
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        // Bug #3 fix: Include system message in fallback token estimate
        if (!inputTokens) {
          const allText = fullApiMessages.map((m: { content: string }) => m.content).join(" ");
          inputTokens = Math.ceil(allText.length / 4);
        }
        if (!outputTokens) {
          outputTokens = Math.ceil(fullResponse.length / 4);
        }

        const cost = calculateCost(model, inputTokens, outputTokens);
        if (cost > 0) {
          const success = await debitCredits(
            userId,
            cost,
            `Chat: ${model.name} (${inputTokens} in / ${outputTokens} out)`
          );
          if (!success) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Insufficient credits" })}\n\n`)
            );
          }
        }

        await db.insert(messagesTable).values({
          conversationId: convId,
          role: "assistant",
          content: fullResponse,
          model: selectedModelId,
          inputTokens,
          outputTokens,
          cost,
        });

        // Bug #10 fix: Update conversation timestamp so sidebar sorts correctly
        await db.update(conversations)
          .set({ updatedAt: sql`datetime('now')` })
          .where(eq(conversations.id, convId));

        if (lastUserMsg) {
          const newMemories = extractMemorableContent(lastUserMsg.content);
          for (const mem of newMemories) {
            await addMemory(userId, mem, "preference");
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
