"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/chat");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-3">
          <span className="text-[var(--accent)]">Latix</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-md">
          Fast, secure AI chat with persistent memory. Your conversations remembered across sessions.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors font-medium"
        >
          Create Account
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl">
        {[
          { title: "Persistent Memory", desc: "Latix remembers your preferences and context across sessions" },
          { title: "Dynamic Pricing", desc: "Credits system with transparent per-token pricing and platform margins" },
          { title: "Free Tier", desc: "Start chatting immediately with free models, upgrade for premium access" },
        ].map((f) => (
          <div key={f.title} className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
