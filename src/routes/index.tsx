import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import CustomHero from "@/components/velorah-hero";
import { useInkline } from "@/lib/inkline-context";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Wryto — A quiet place for words that matter" },
      {
        name: "description",
        content: "Share words, discover writers, and read without distraction.",
      },
      { property: "og:title", content: "Wryto — A quiet place for words that matter" },
      {
        property: "og:description",
        content: "Share words, discover writers, and read without distraction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: IndexErrorComponent,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, user, authInitialized } = useInkline();
  const isAuthenticated = Boolean(session?.user || user);

  useEffect(() => {
    if (authInitialized && isAuthenticated) {
      void navigate({ to: "/feed", replace: true });
    }
  }, [authInitialized, isAuthenticated, navigate]);

  // While restoring and validating session on startup:
  if (!authInitialized) {
    return (
      <div
        className="min-h-screen h-screen w-full flex flex-col items-center justify-center bg-[#00172d] text-white"
        aria-label="Checking session..."
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>
    );
  }

  // Once authenticated session is confirmed, keep clean background until transition to /feed finishes
  if (isAuthenticated) {
    return (
      <div
        className="min-h-screen h-screen w-full flex flex-col items-center justify-center bg-[#00172d] text-white"
        aria-label="Redirecting to feed..."
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>
    );
  }

  // Unauthenticated user: render the full public Landing Page
  return <CustomHero />;
}

function IndexErrorComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Wryto</h1>
        <p className="text-sm text-muted-foreground">
          A quiet place for words that matter. Click below to explore the latest stories and essays.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <a
            href="/feed"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Explore Feed
          </a>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
