import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import CustomHero from "@/components/velorah-hero";
import { useInkline } from "@/lib/inkline-context";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Wryto — Where thoughtful words find their quiet home" },
      {
        name: "description",
        content:
          "A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays, stories, and ideas that linger.",
      },
      { property: "og:title", content: "Wryto — Where thoughtful words find their quiet home" },
      {
        property: "og:description",
        content:
          "A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays, stories, and ideas that linger.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Wryto" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Wryto — Where thoughtful words find their quiet home" },
      {
        name: "twitter:description",
        content:
          "A distraction-free publishing haven. No algorithmic outrage. No video noise. Just essays, stories, and ideas that linger.",
      },
    ],
  }),
  errorComponent: IndexErrorComponent,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, user } = useInkline();
  const isAuthenticated = Boolean(session?.user || user);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/feed", replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return <CustomHero />;
}

function IndexErrorComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Wryto</h1>
        <p className="text-sm text-muted-foreground font-reading">
          Where thoughtful words find their quiet home. Click below to explore the latest stories and
          essays.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <a
            href="/feed"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Explore Stories
          </a>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
