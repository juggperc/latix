"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

interface Props {
  conversations: { id: string; title: string; updatedAt: string }[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  credits: number;
  plan: string;
  onClose: () => void;
}

export function Sidebar({ conversations, currentId, onSelect, onNew, credits, plan, onClose }: Props) {
  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col h-full shrink-0">
      <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
        <button
          onClick={onNew}
          className="flex-1 py-2 px-3 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          + New Chat
        </button>
        <button onClick={onClose} className="ml-2 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
              c.id === currentId
                ? "bg-[var(--bg-tertiary)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Credits: {credits.toFixed(0)}</span>
          <span className="capitalize">{plan}</span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="flex-1 text-center py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
