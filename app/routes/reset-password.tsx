import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon } from "@hugeicons/core-free-icons";
import { AuthShell } from "~/components/auth-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

export function meta() {
  return [{ title: "Reset password · OpenBingeBoard" }];
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not reset the password.");
        return;
      }
      setMessage("Password updated. You can sign in with the new password.");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not reset the password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon
            icon={LockPasswordIcon}
            strokeWidth={2}
            className="size-5"
          />
        </span>
        <h1 className="mt-4 font-display text-3xl tracking-tight">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The reset link expires. Request a new one from the sign-in page if it
          no longer works.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block space-y-1.5 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">
              New password
            </span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="block space-y-1.5 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">
              Confirm password
            </span>
            <Input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error ? (
            <p
              className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] leading-5 text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              className="rounded-lg bg-muted px-3 py-2 text-[11px] leading-5 text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Update password"}
          </Button>
          <Link
            to="/login?mode=signin"
            className="block text-center text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </AuthShell>
  );
}
