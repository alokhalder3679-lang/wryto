import { cn } from "@/lib/utils";
import { type Conversation, chatRelativeTime } from "@/lib/chat-context";
import { getAvatarUrl } from "@/lib/avatar";
import { useState } from "react";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function Avatar({
  name,
  avatar,
  online,
  size = "md",
}: {
  name: string;
  avatar: string | null;
  online: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const sz = size === "sm" ? "size-9" : size === "lg" ? "size-20" : "size-12";
  const avatarSrc = getAvatarUrl(avatar);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cn("relative shrink-0 rounded-full", sz)}>
      {avatarSrc && !imgError ? (
        <img
          src={avatarSrc}
          alt={name}
          className={cn("rounded-full object-cover", sz)}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-primary/15 font-bold text-primary",
            sz,
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {initials}
        </span>
      )}
      <span
        className={cn(
          "absolute bottom-0 right-0 size-3 rounded-full border-2 border-background",
          online ? "bg-emerald-500" : "bg-muted-foreground",
        )}
      />
    </span>
  );
}

export function ConversationList({ conversations, activeId, onSelect }: Props) {
  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
            activeId === conv.id ? "bg-primary/10 dark:bg-primary/15" : "hover:bg-muted/60",
          )}
        >
          <Avatar
            name={conv.participantName}
            avatar={conv.participantAvatar}
            online={conv.online}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{conv.participantName}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {chatRelativeTime(conv.lastAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="truncate text-xs text-muted-foreground">{conv.lastMessage}</span>
              {conv.unread > 0 && (
                <span className="shrink-0 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {conv.unread}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
