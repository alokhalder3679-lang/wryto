import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

function ExplorePage() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/discover", replace: true });
  }, [navigate]);
  return null;
}

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});
