import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessageStatus } from "@/lib/chat-context";
import { formatMessageTimestamp } from "@/lib/chat-api";

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "sending")
    return <span className="text-muted-foreground/60 text-[10px]">•••</span>;
  if (status === "sent") return <Check className="size-3 text-muted-foreground" />;
  if (status === "delivered") return <CheckCheck className="size-3 text-muted-foreground" />;
  if (status === "seen") return <CheckCheck className="size-3 text-primary" />;
  return null;
}

type Props = {
  message: ChatMessage;
  isMine: boolean;
  showTail?: boolean;
};

export function MessageBubble({ message, isMine, showTail }: Props) {
  void showTail;
  return (
    <div className={cn("flex w-full items-end gap-1.5", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isMine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={cn("mt-1 flex items-center gap-1", isMine ? "justify-end" : "justify-start")}
        >
          <span
            className={cn(
              "text-[10px]",
              isMine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {formatMessageTimestamp(message.createdAt)}
          </span>
          {isMine && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
