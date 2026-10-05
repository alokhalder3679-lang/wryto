// ─── Typing Indicator ─────────────────────────────────────────
export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2 px-1">
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1" aria-label={`${name} is typing`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/60"
              style={{ animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
      <span className="mb-1 text-[10px] text-muted-foreground">{name} is typing…</span>
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
