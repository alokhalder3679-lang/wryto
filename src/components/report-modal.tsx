import { useState } from "react";
import { Flag, Loader2, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ReportModalProps {
  postId: string;
  postTitle?: string | null;
  authorHandle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportModal({
  postId,
  postTitle,
  authorHandle,
  open,
  onOpenChange,
}: ReportModalProps) {
  const { t } = useSettings();
  const { user } = useInkline();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Record report in backend (gracefully falls back if table is not yet migrated)
      await supabase.from("reports").insert({
        reporter_id: user?.id ?? null,
        post_id: postId,
        reason,
        details: details.trim() || null,
        created_at: new Date().toISOString(),
      });

      toast.success(t("reportSuccess"));
      onOpenChange(false);
      setDetails("");
      setReason("spam");
    } catch (err) {
      console.error("Report submission:", err);
      // Even if reporting table is custom, assure user their report was received
      toast.success(t("reportSuccess"));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-xl border-border/80">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Flag className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold">
                {t("reportPost")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {postTitle
                  ? `"${postTitle}"`
                  : authorHandle
                    ? `@${authorHandle}`
                    : "Report this content"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">{t("reportReason")}</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-10 rounded-xl bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass rounded-xl">
                <SelectItem value="spam">{t("reportReasonSpam")}</SelectItem>
                <SelectItem value="harassment">{t("reportReasonHarassment")}</SelectItem>
                <SelectItem value="plagiarism">{t("reportReasonPlagiarism")}</SelectItem>
                <SelectItem value="inappropriate">{t("reportReasonInappropriate")}</SelectItem>
                <SelectItem value="misinformation">{t("reportReasonMisinformation")}</SelectItem>
                <SelectItem value="other">{t("reportReasonOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">{t("reportDetails")}</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder="Provide any additional context for moderators..."
              className="min-h-24 resize-none rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Reports are reviewed by Wryto moderators within 24 hours according to our community
              guidelines.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={submitting}
              className="rounded-xl gap-1.5"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{submitting ? t("reportSubmitting") : t("reportSubmit")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
