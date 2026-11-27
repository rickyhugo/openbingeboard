import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  redirect,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";
import { safeNext } from "~/lib/auth-redirect";
import { auth } from "~/server/auth.server";
import type { loader as rootLoader } from "~/root";
import type { Route } from "./+types/login";

type Mode = "signin" | "signup" | "forgot";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const next = safeNext(new URL(request.url).searchParams.get("next"));
  throw redirect(next);
}

export function meta() {
  return [{ title: "Log in · OpenBingeBoard" }];
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid") && lower.includes("password")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("not verified") || lower.includes("verify your email")) {
    return "Verify your email before signing in. Check your inbox or resend the verification email.";
  }
  if (
    lower.includes("already exists") ||
    lower.includes("already registered")
  ) {
    return "An account already exists for this email. Sign in instead.";
  }
  if (lower.includes("password") && lower.includes("8")) {
    return "Use a password of at least 8 characters.";
  }
  return message || "Authentication failed.";
}

export default function Login() {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const [params, setParams] = useSearchParams();
  const user = root?.user ?? null;
  const emailEnabled = root?.emailEnabled ?? false;
  const verificationRequired = root?.emailVerificationRequired ?? false;
  const next = safeNext(params.get("next"));

  const rawMode = params.get("mode");
  const mode: Mode =
    rawMode === "signup"
      ? "signup"
      : rawMode === "forgot"
        ? "forgot"
        : "signin";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function changeMode(nextMode: Mode) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("mode", nextMode);
    setParams(nextParams, { replace: true });
    setError("");
    setMessage("");
    setNeedsVerification(false);
    setVerificationEmail("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    setNeedsVerification(false);

    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (result.error) {
          setError(
            friendlyError(
              result.error.message ?? "Could not send the reset email.",
            ),
          );
          return;
        }
        setMessage(
          "If an account exists for that email, a reset link is on the way.",
        );
        return;
      }

      if (mode === "signup") {
        if (!name.trim()) {
          setError("Enter your name.");
          return;
        }
        if (password.length < 8) {
          setError("Use a password of at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
      }

      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              name: name.trim(),
              email,
              password,
              callbackURL: next,
            });

      if (result.error) {
        const friendly = friendlyError(
          result.error.message ?? "Authentication failed.",
        );
        setError(friendly);
        setNeedsVerification(friendly.toLowerCase().includes("verify"));
        return;
      }

      if (mode === "signup" && verificationRequired) {
        setVerificationEmail(email);
        setPassword("");
        setConfirmPassword("");
        return;
      }

      window.location.assign(next);
    } catch {
      setError("Authentication failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    const target = verificationEmail || email;
    if (!target) {
      setError("Enter your email first.");
      return;
    }
    if (cooldown > 0) return;

    setPending(true);
    setError("");
    try {
      const result = await authClient.sendVerificationEmail({
        email: target,
        callbackURL: next,
      });
      if (result.error) {
        setError(
          friendlyError(result.error.message ?? "Could not resend the email."),
        );
        return;
      }
      setMessage("Verification email sent.");
      setCooldown(30);
    } catch {
      setError("Could not resend the email.");
    } finally {
      setPending(false);
    }
  }

  if (user) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>You are signed in</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to={next}
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Continue
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (verificationEmail) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to{" "}
              <span className="font-mono text-foreground">
                {verificationEmail}
              </span>
              . Open it, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {message ? (
              <p className="text-xs text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendVerification}
                disabled={pending || cooldown > 0}
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : pending
                    ? "Sending..."
                    : "Resend email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVerificationEmail("");
                  changeMode("signin");
                }}
              >
                Back to sign in
              </Button>
            </div>
            <Link
              to={next === "/profile" ? "/" : next}
              className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Continue as guest
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const title =
    mode === "signin"
      ? "Log in"
      : mode === "signup"
        ? "Create an account"
        : "Reset your password";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Sync your services, watchlist, and saved views across devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" ? (
              <label className="block space-y-1 text-xs">
                <span className="text-muted-foreground">Name</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  required
                  className="h-8"
                />
              </label>
            ) : null}

            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="h-8"
              />
            </label>

            {mode !== "forgot" ? (
              <label className="block space-y-1 text-xs">
                <span className="text-muted-foreground">Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  required
                  className="h-8"
                />
                {mode === "signup" ? (
                  <span className="block text-[10px] text-muted-foreground">
                    At least 8 characters.
                  </span>
                ) : null}
              </label>
            ) : null}

            {mode === "signup" ? (
              <label className="block space-y-1 text-xs">
                <span className="text-muted-foreground">Confirm password</span>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-8"
                />
              </label>
            ) : null}

            {mode === "signin" && emailEnabled ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => changeMode("forgot")}
              >
                Forgot password?
              </button>
            ) : null}

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="text-xs text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {needsVerification ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resendVerification}
                  disabled={pending || cooldown > 0}
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : pending
                      ? "Sending..."
                      : "Resend verification"}
                </Button>
              ) : null}

              <Button type="submit" size="sm" disabled={pending}>
                {pending
                  ? "Working..."
                  : mode === "signin"
                    ? "Log in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground"
              onClick={() =>
                changeMode(
                  mode === "signin"
                    ? "signup"
                    : mode === "signup"
                      ? "signin"
                      : "signin",
                )
              }
            >
              {mode === "signin"
                ? "Create an account"
                : mode === "forgot"
                  ? "Back to sign in"
                  : "I already have an account"}
            </button>
            <Link
              to={next === "/profile" ? "/" : next}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Continue as guest
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
