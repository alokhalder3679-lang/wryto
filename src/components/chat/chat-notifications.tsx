// ─── Incoming message / call notification toast ───────────────
import { useEffect, useRef } from "react";
import { Phone, MessageCircle, X, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";

export function ChatNotificationToast() {
  const { call, acceptCall, rejectCall } = useChat();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (call.phase === "incoming") {
      // Vibrate on mobile
      if ("vibrate" in navigator) {
        navigator.vibrate([400, 200, 400, 200, 400]);
      }
    }
    return () => {
      if (audio) audio.pause();
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, [call.phase]);

  if (call.phase !== "incoming") return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 z-[60] -translate-x-1/2 w-[340px] max-w-[92vw]",
        "glass rounded-2xl px-4 py-3 shadow-2xl",
        "animate-in slide-in-from-top-4 fade-in duration-300",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/20">
          {call.kind === "video" ? (
            <Video className="size-5 text-primary" />
          ) : (
            <Phone className="size-5 text-primary animate-bounce" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{call.peerName}</p>
          <p className="text-xs text-muted-foreground">
            Incoming {call.kind === "video" ? "video" : "audio"} call…
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={rejectCall}
            className="grid size-9 place-items-center rounded-full bg-red-500/90 text-white transition-all hover:bg-red-600 active:scale-95"
            aria-label="Decline"
          >
            <X className="size-4" />
          </button>
          <button
            onClick={acceptCall}
            className="grid size-9 place-items-center rounded-full bg-emerald-500/90 text-white transition-all hover:bg-emerald-600 active:scale-95"
            aria-label="Accept"
          >
            <Phone className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Small floating chat button shown on non-chat pages
export function FloatingChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 left-5 z-20 lg:bottom-8 lg:left-8",
        "size-13 grid place-items-center rounded-full shadow-xl",
        "bg-primary text-primary-foreground",
        "transition-all hover:scale-105 active:scale-95",
      )}
      aria-label="Open chat"
    >
      <MessageCircle className="size-5" />
    </button>
  );
}
