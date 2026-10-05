import { createFileRoute } from "@tanstack/react-router";
import CustomHero from "@/components/velorah-hero";

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
  component: Index,
});

function Index() {
  return <CustomHero />;
}
