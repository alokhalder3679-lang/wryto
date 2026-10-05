import { useSettings } from "@/lib/user-settings";
import { type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  variant?: "pill" | "icon" | "compact";
  className?: string;
}

export function LanguageToggle({ variant = "pill", className }: LanguageToggleProps) {
  const { settings, update } = useSettings();
  const currentLang = settings.language;

  const toggleEnBn = async () => {
    const next: Lang = currentLang === "bn" ? "en" : "bn";
    await update({ language: next });
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => void toggleEnBn()}
        title="Switch language (EN / বাংলা)"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all hover:bg-accent hover:text-accent-foreground active:scale-95",
          className,
        )}
      >
        <Globe className="size-3.5 text-primary" />
        <span
          className={cn(
            currentLang === "en" ? "font-bold text-foreground" : "text-muted-foreground",
          )}
        >
          EN
        </span>
        <span className="text-border">/</span>
        <span
          className={cn(
            currentLang === "bn" ? "font-bold text-foreground" : "text-muted-foreground",
          )}
        >
          বাংলা
        </span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-border/70 bg-muted/40 p-0.5 text-xs font-medium backdrop-blur-md",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => void update({ language: "en" })}
          className={cn(
            "rounded-full px-2.5 py-1 transition-all",
            currentLang === "en"
              ? "bg-background text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => void update({ language: "bn" })}
          className={cn(
            "rounded-full px-2.5 py-1 transition-all",
            currentLang === "bn"
              ? "bg-background text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          বাংলা
        </button>
      </div>
    );
  }

  // "icon" dropdown with full options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-9 rounded-full", className)}
          aria-label="Select language"
        >
          <Globe className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass w-36 rounded-xl">
        <DropdownMenuItem
          className={cn("cursor-pointer", currentLang === "en" && "font-bold text-primary")}
          onClick={() => void update({ language: "en" })}
        >
          English (EN)
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("cursor-pointer", currentLang === "bn" && "font-bold text-primary")}
          onClick={() => void update({ language: "bn" })}
        >
          বাংলা (BN)
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("cursor-pointer", currentLang === "hi" && "font-bold text-primary")}
          onClick={() => void update({ language: "hi" })}
        >
          हिन्दी (HI)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
