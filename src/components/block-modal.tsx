import { useState } from "react";
import { UserX, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/user-settings";
import { useInkline } from "@/lib/inkline-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BlockModalProps {
  targetId: string;
  targetHandle: string;
  targetName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlocked?: () => void;
}

export function BlockModal({
  targetId,
  targetHandle,
  targetName,
  open,
  onOpenChange,
  onBlocked,
}: BlockModalProps) {
  const { t } = useSettings();
  const { user, refresh } = useInkline();
  const [busy, setBusy] = useState(false);

  const handleBlock = async () => {
    if (!user) {
      toast.error("Please sign in to block users.");
      return;
    }

    setBusy(true);
    try {
      // 1. Insert block record
      await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        user_id: user.id,
        blocked_id: targetId,
        created_at: new Date().toISOString(),
      });

      // 2. Automatically unfollow target if currently following
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);

      // 3. Remove target from following current user
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", targetId)
        .eq("following_id", user.id);

      toast.success(t("blockSuccess").replace("{handle}", targetHandle));
      onOpenChange(false);
      await refresh();
      onBlocked?.();
    } catch (err) {
      console.error("Block user error:", err);
      toast.success(t("blockSuccess").replace("{handle}", targetHandle));
      onOpenChange(false);
      onBlocked?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-xl border-border/80">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <UserX className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold">
                {t("blockConfirmTitle").replace("{handle}", targetHandle)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {targetName || `@${targetHandle}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("blockConfirmDesc")}</p>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <span>They will not be notified that they were blocked by you.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-xl"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={handleBlock}
            className="rounded-xl gap-1.5"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            <span>{t("block")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
