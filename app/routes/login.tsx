import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  redirect,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { CheckCircle, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { AuthShell } from "~/components/auth-shell";
import { Button, buttonVariants } from "~/components/ui/button";
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
      <AuthShell>
        <div className=" border border-border bg-card p-6 shadow-sm sm:p-7">
          <span className="grid size-11 place-items-center bg-muted text-foreground">
            <CheckCircle weight="bold" className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            You are signed in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <Link
            to={next}
            className={buttonVariants({ className: "mt-6 w-full" })}
          >
            Continue
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (verificationEmail) {
    return (
      <AuthShell>
        <div className=" border border-border bg-card p-6 shadow-sm sm:p-7">
          <span className="grid size-11 place-items-center bg-muted text-foreground">
            <EnvelopeSimple weight="bold" className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {verificationEmail}
            </span>
            . Open it, then sign in.
          </p>
          <div className="mt-5 space-y-2">
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
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
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
            className="mt-5 inline-block text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Continue as guest
          </Link>
        </div>
      </AuthShell>
    );
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create an account"
        : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Pick up where you left off."
      : mode === "signup"
        ? "Keep your services and lists in sync."
        : "We will email you a link to choose a new password.";

  return (
    <AuthShell>
      <div className=" border border-border bg-card p-6 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" ? (
            <label className="block space-y-1.5 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">
                Name
              </span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>
          ) : null}

          <label className="block space-y-1.5 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">
              Email
            </span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {mode !== "forgot" ? (
            <label className="block space-y-1.5 text-xs">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Password
                </span>
                {mode === "signin" && emailEnabled ? (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => changeMode("forgot")}
                  >
                    Forgot?
                  </button>
                ) : null}
              </span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                minLength={8}
                required
              />
              {mode === "signup" ? (
                <span className="block text-[10px] text-muted-foreground">
                  At least 8 characters.
                </span>
              ) : null}
            </label>
          ) : null}

          {mode === "signup" ? (
            <label className="block space-y-1.5 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">
                Confirm password
              </span>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          ) : null}

          {error ? (
            <p
              className=" bg-destructive/10 px-3 py-2 text-[11px] leading-5 text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p
              className=" bg-muted px-3 py-2 text-[11px] leading-5 text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
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

            <Button type="submit" className="w-full" disabled={pending}>
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

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/70 pt-4 text-[11px] text-muted-foreground">
          <button
            type="button"
            className="underline-offset-4 hover:text-foreground hover:underline"
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
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Browse as guest
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
