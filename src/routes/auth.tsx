import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WrytoLogo } from "@/components/wryto-logo";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useInkline } from "@/lib/inkline-context";
import { setRememberMe } from "@/lib/remember-me";
import { EMAIL_RE, passwordProblems } from "@/lib/password-rules";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Sign in — Wryto" },
      { name: "description", content: "Join Wryto to read and share thoughtful writing." },
      { property: "og:title", content: "Sign in — Wryto" },
      { property: "og:description", content: "Join Wryto to read and share thoughtful writing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n = s["next"];
    return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? { next: n } : {};
  },
  component: AuthPage,
});

type Mode = "signin" | "signup" | "verify" | "forgot";
const COOLDOWN = 60;

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { user } = useInkline();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const goNext = (dest?: string) => {
    const to = dest ?? next;
    if (to) window.location.href = to;
    else void navigate({ to: "/feed", replace: true });
  };

  useEffect(() => {
    if (user) {
      console.log("[Supabase Auth] Active session detected for user:", user.id);
      setInfo("Signed in! Redirecting to your feed…");
      const timer = setTimeout(() => goNext(), 600);
      return () => clearTimeout(timer);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    // Check URL query parameters and hash for OAuth redirect errors or cancellations
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.substring(1));
    const oauthError =
      params.get("error_description") ||
      hash.get("error_description") ||
      params.get("error") ||
      hash.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, " ")));
    }
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login credentials")) {
      return "Invalid email or password. Please check your spelling and password, or use Forgot Password to reset it.";
    }
    if (lower.includes("user already registered")) {
      return "An account with this email already exists. Try signing in.";
    }
    if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
      return "Please verify your email before logging in. We have sent a confirmation code to your inbox.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      return "Email rate limit exceeded for default mailer (2 emails/hr). Please configure custom SMTP or wait a few minutes.";
    }
    return msg;
  };

  const fail = (e: unknown) => {
    console.error("[Supabase Auth Error]", e);
    const raw = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    setError(mapErrorMessage(raw));
  };

  async function run(fn: () => Promise<void>) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  // Email + Password Sign In
  const signIn = () =>
    run(async () => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Please enter your email address.");
      if (!EMAIL_RE.test(cleanEmail)) throw new Error("Please enter a valid email address.");
      if (!password) throw new Error("Please enter your password.");

      console.log("[Supabase Auth] Attempting sign-in for:", cleanEmail);
      const { data, error: e } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      console.log("[Supabase Auth] Sign-in response:", {
        userId: data?.user?.id,
        sessionActive: !!data?.session,
        error: e ? e.message : null,
      });

      if (e) {
        if (e.message.toLowerCase().includes("not confirmed")) {
          await supabase.auth.resend({ type: "signup", email: cleanEmail }).catch(() => null);
          setMode("verify");
          setCooldown(COOLDOWN);
          throw new Error(
            "Please verify your email before logging in. Check your inbox or click the link in your email.",
          );
        }
        throw e;
      }

      setRememberMe(remember);
      goNext();
    });

  // Email + Password Sign Up
  const signUp = () =>
    run(async () => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Please enter your email address.");
      if (!EMAIL_RE.test(cleanEmail)) throw new Error("Please enter a valid email address.");
      const p = passwordProblems(password);
      if (p.length) throw new Error(`Password needs ${p.join(", ")}.`);

      console.log("[Supabase Auth] Attempting sign-up for:", cleanEmail);
      const { data, error: e } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { display_name: name.trim() || cleanEmail.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      console.log("[Supabase Auth] Sign-up response:", {
        userId: data?.user?.id,
        sessionActive: !!data?.session,
        error: e ? e.message : null,
      });

      if (e) throw e;
      if (data.user && data.user.identities?.length === 0) {
        throw new Error("An account with this email already exists. Try signing in.");
      }

      // If Supabase confirms session immediately (mailer_autoconfirm is active)
      if (data.session) {
        setRememberMe(true);
        setInfo("Account created! Redirecting to your feed…");
        setTimeout(() => goNext(), 800);
        return;
      }

      setMode("verify");
      setCooldown(COOLDOWN);
      setInfo(`Confirmation sent to ${cleanEmail}. Enter the code or click the link in the email.`);
    });

  // Verify OTP
  const verify = () =>
    run(async () => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();
      if (!/^\d{6,8}$/.test(cleanCode))
        throw new Error("Enter the 6-digit or 8-digit code from your email.");

      console.log("[Supabase Auth] Verifying OTP for:", cleanEmail);
      let res = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "signup",
      });

      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email",
        });
      }

      if (res.error) {
        console.error("[Supabase Auth] Verify OTP error:", res.error);
        throw new Error(
          res.error.message.includes("expired")
            ? "That code has expired. Please request a new one."
            : "Invalid verification code. Please check and try again.",
        );
      }

      setRememberMe(true);
      setInfo("Email verified! Redirecting to your feed…");
      const { data: profile } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", res.data.user!.id)
        .maybeSingle();
      setTimeout(() => goNext(profile ? `/profile/${profile.handle}` : "/feed"), 1000);
    });

  // Resend OTP
  const resend = () =>
    run(async () => {
      const cleanEmail = email.trim().toLowerCase();
      console.log("[Supabase Auth] Resending OTP to:", cleanEmail);
      const { error: e } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
      if (e) throw e;
      setCooldown(COOLDOWN);
      setInfo("A new verification code has been sent to your email.");
    });

  // Forgot Password
  const forgot = () =>
    run(async () => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !EMAIL_RE.test(cleanEmail))
        throw new Error("Enter a valid email address.");
      console.log("[Supabase Auth] Requesting password reset for:", cleanEmail);
      const { error: e } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (e) throw e;
      setInfo("If an account exists for that email, a password reset link has been sent.");
    });

  // Google OAuth Login
  async function handleGoogleLogin() {
    setError(null);
    setInfo(null);
    setOauthBusy(true);
    try {
      const redirectUri = `${window.location.origin}${next || "/feed"}`;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
        },
      });
      if (e) throw e;
    } catch (e) {
      fail(e);
      setOauthBusy(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    signin: ["Welcome back", "Sign in to access your personal feed and stories."],
    signup: ["Create an account", "Join Wryto to read and share thoughtful writing."],
    verify: ["Verify your email", "Enter the verification code sent to your inbox."],
    forgot: ["Reset your password", "We'll send you instructions to reset your password."],
  };

  const pwIssues = passwordProblems(password);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {/* Brand Header */}
      <Link
        to="/"
        className="mb-8 flex items-center justify-center transition-opacity hover:opacity-90"
      >
        <WrytoLogo variant="full" size="lg" className="h-16" />
      </Link>

      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{titles[mode][0]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{titles[mode][1]}</p>
      </div>

      <div className="mt-8 space-y-4">
        {/* Social Authentication: Google Only */}
        {(mode === "signin" || mode === "signup") && (
          <>
            <Button
              variant="outline"
              type="button"
              className="h-12 w-full gap-3 font-medium transition-all duration-200 hover:bg-muted/60 active:scale-[0.99]"
              disabled={busy || oauthBusy}
              onClick={() => void handleGoogleLogin()}
            >
              {oauthBusy ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </Button>

            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or continue with email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {/* Email + Password Form Fields */}
        {mode === "signup" && (
          <Input
            className="h-12"
            placeholder="Your name (optional)"
            aria-label="Your name"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {mode !== "verify" && (
          <Input
            className="h-12"
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (mode === "forgot") void forgot();
              }
            }}
          />
        )}

        {(mode === "signin" || mode === "signup") && (
          <Input
            className="h-12"
            type="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void (mode === "signup" ? signUp() : signIn());
              }
            }}
          />
        )}

        {mode === "signup" && password && pwIssues.length > 0 && (
          <p className="text-xs text-muted-foreground">Password needs {pwIssues.join(", ")}.</p>
        )}

        {mode === "signin" && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                className="accent-primary rounded size-4"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => switchMode("forgot")}
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* OTP Verification Mode */}
        {mode === "verify" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <p>
                Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong>.
              </p>
            </div>
            <Input
              className="h-14 text-center text-2xl tracking-[0.4em] font-mono"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="••••••"
              aria-label="Verification code"
              value={code}
              disabled={busy}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && void verify()}
            />
          </div>
        )}

        {/* Info Message Banner */}
        {info && (
          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <p className="flex-1 text-xs leading-relaxed">{info}</p>
          </div>
        )}

        {/* Error Message Banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p className="flex-1 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        {mode === "signin" && (
          <Button
            type="button"
            className="h-12 w-full font-medium"
            disabled={busy || oauthBusy || !email || !password}
            onClick={() => void signIn()}
          >
            {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {busy ? "Signing in…" : "Sign In"}
          </Button>
        )}

        {mode === "signup" && (
          <Button
            type="button"
            className="h-12 w-full font-medium"
            disabled={busy || oauthBusy || !email || !password}
            onClick={() => void signUp()}
          >
            {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {busy ? "Creating account…" : "Create Account"}
          </Button>
        )}

        {mode === "verify" && (
          <div className="space-y-2">
            <Button
              type="button"
              className="h-12 w-full font-medium"
              disabled={busy || code.length < 6}
              onClick={() => void verify()}
            >
              {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {busy ? "Verifying…" : "Verify Email"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 py-1"
              disabled={cooldown > 0 || busy}
              onClick={() => void resend()}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get a code? Resend"}
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <Button
            type="button"
            className="h-12 w-full font-medium"
            disabled={busy || !email}
            onClick={() => void forgot()}
          >
            {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {busy ? "Sending…" : "Send Reset Link"}
          </Button>
        )}
      </div>

      {/* Switch Mode Footer */}
      {mode === "signin" || mode === "signup" ? (
        <button
          type="button"
          className="mt-6 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? " : "New to Wryto? "}
          <span className="font-semibold text-primary underline-offset-4 hover:underline">
            {mode === "signup" ? "Sign in" : "Create an account"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="mt-6 text-center text-sm font-semibold text-primary hover:underline"
          onClick={() => switchMode("signin")}
        >
          Back to sign in
        </button>
      )}

      <Link
        to="/feed"
        className="mt-4 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Keep reading as a guest
      </Link>
    </main>
  );
}
