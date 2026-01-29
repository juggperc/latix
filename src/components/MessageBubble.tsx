"use client";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-2xl chat-message ${
          isUser
            ? "bg-[var(--accent)] text-white rounded-br-md"
            : "bg-[var(--bg-secondary)] border border-[var(--border)] rounded-bl-md"
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</div>
      </div>
    </div>
  );
}
