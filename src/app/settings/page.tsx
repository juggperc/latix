"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState("free");
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    const [memRes, credRes] = await Promise.all([
      fetch("/api/memories"),
      fetch("/api/credits"),
    ]);
    if (memRes.ok) setMemories(await memRes.json());
    if (credRes.ok) {
      const data = await credRes.json();
      setCredits(data.credits);
      setPlan(data.plan);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  async function addMemory() {
    if (!newMemory.trim()) return;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMemory, type: "general" }),
    });
    setNewMemory("");
    load();
  }

  async function deleteMemory(id: string) {
    await fetch("/api/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Link href="/chat" className="text-sm text-[var(--accent)] hover:underline">
          Back to Chat
        </Link>
      </div>

      {/* Account */}
      <section className="mb-8 p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
        <h2 className="font-semibold mb-3">Account</h2>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Plan</span>
          <span className="capitalize">{plan}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-[var(--text-muted)]">Credits</span>
          <span>{credits.toFixed(0)}</span>
        </div>
        {plan === "free" && (
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Upgrade to Pro ($15/mo) for 15,000 monthly credits and premium models.
          </p>
        )}
      </section>

      {/* Memories */}
      <section className="p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
        <h2 className="font-semibold mb-3">Memories ({memories.length}/500)</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Latix remembers things about you across conversations. Add or remove memories here.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Add a memory..."
            maxLength={2000}
            className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={addMemory}
            className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)]"
          >
            Add
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {memories.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-2 p-3 bg-[var(--bg)] rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs text-[var(--accent)] mr-2">[{m.type}]</span>
                <span className="text-sm break-words">{m.content}</span>
              </div>
              <button
                onClick={() => deleteMemory(m.id)}
                className="text-[var(--text-muted)] hover:text-red-400 shrink-0 text-xs"
              >
                delete
              </button>
            </div>
          ))}
          {memories.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No memories yet. They&apos;ll be created automatically as you chat.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
