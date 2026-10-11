import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WrytoLogo } from "@/components/wryto-logo";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { passwordProblems } from "@/lib/password-rules";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Reset password — Wryto" },
      { name: "description", content: "Choose a new password for your Wryto account." },
      { property: "og:title", content: "Reset password — Wryto" },
      { property: "og:description", content: "Choose a new password for your Wryto account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ResetPasswordErrorComponent,
  component: ResetPassword,
});

function ResetPasswordErrorComponent() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
      <Link
        to="/"
        className="mb-8 flex items-center justify-center transition-opacity hover:opacity-90"
      >
        <WrytoLogo variant="full" size="lg" className="h-16" />
      </Link>
      <h1 className="font-display text-2xl font-semibold">Unable to load password reset</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please try requesting a new reset link or sign in to your account.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Refresh</Button>
        <Button variant="outline" asChild>
          <Link to="/auth">Back to Sign In</Link>
        </Button>
      </div>
    </main>
  );
}

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  const problems = passwordProblems(pw);
  async function save() {
    setError(null);
    if (problems.length) return setError(`Password needs ${problems.join(", ")}.`);
    if (pw !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (e) return setError(e.message);
    setDone(true);
    setTimeout(() => void navigate({ to: "/feed", replace: true }), 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link
        to="/"
        className="mb-12 flex items-center justify-center transition-opacity hover:opacity-90"
      >
        <WrytoLogo variant="full" size="lg" className="h-14" />
      </Link>
      <div className="glass rounded-2xl p-6">
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
        {done ? (
          <p className="mt-4 text-sm text-primary">Password updated. Taking you home…</p>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Open this page from the reset link in your email.{" "}
            <Link to="/auth" className="font-semibold text-foreground">
              Back to sign in
            </Link>
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <Input
              className="h-12"
              type="password"
              placeholder="New password"
              aria-label="New password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            {pw && problems.length > 0 && (
              <p className="text-xs text-muted-foreground">Needs {problems.join(", ")}.</p>
            )}
            <Input
              className="h-12"
              type="password"
              placeholder="Confirm password"
              aria-label="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full" disabled={busy || !pw} onClick={() => void save()}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
