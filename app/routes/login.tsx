import { useState, type FormEvent } from "react";
import { Link, useRouteLoaderData } from "react-router";
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
import type { loader as rootLoader } from "~/root";

type Mode = "signin" | "signup" | "forgot";

export function meta() {
  return [{ title: "Sign in · OpenBingeBoard" }];
}

export default function Login() {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const user = root?.user ?? null;
  const emailEnabled = root?.emailEnabled ?? false;
  const verificationRequired = root?.emailVerificationRequired ?? false;
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (result.error) {
          setError(result.error.message ?? "Could not send the reset email.");
          return;
        }
        setMessage(
          "If an account exists for that email, a reset link is on the way.",
        );
        return;
      }

      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message ?? "Authentication failed.");
        return;
      }

      if (mode === "signup" && verificationRequired) {
        setMessage(
          "Account created. Check your email to verify the address before signing in.",
        );
        return;
      }

      window.location.assign("/profile");
    } catch {
      setError("Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/profile",
      });
      if (result.error) {
        setError(result.error.message ?? "Could not resend the email.");
        return;
      }
      setMessage("Verification email sent.");
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
              to="/profile"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Open my profile
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const title =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create an account"
        : "Reset your password";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Sync your services, watchlist, and saved views across devices. The
            catalogue works without an account.
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
              </label>
            ) : null}

            {mode === "signin" && emailEnabled ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setMessage("");
                }}
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
              {verificationRequired &&
              (mode === "signup" || error.toLowerCase().includes("verif")) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resendVerification}
                  disabled={pending}
                >
                  Resend verification email
                </Button>
              ) : null}

              <Button type="submit" size="sm" disabled={pending}>
                {pending
                  ? "Working..."
                  : mode === "signin"
                    ? "Sign in"
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
              onClick={() => {
                setMode(
                  mode === "signin"
                    ? "signup"
                    : mode === "signup"
                      ? "signin"
                      : "signin",
                );
                setError("");
                setMessage("");
              }}
            >
              {mode === "signin"
                ? "Create an account"
                : mode === "forgot"
                  ? "Back to sign in"
                  : "I already have an account"}
            </button>
            <Link
              to="/"
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
