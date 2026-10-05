import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/feed", replace: true });
  }, [navigate]);
  return null;
}

export const Route = createFileRoute("/home")({
  component: HomePage,
});
