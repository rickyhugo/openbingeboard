import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
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
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            The reset link expires. Request a new one from the sign-in page if
            it no longer works.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">New password</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="h-8"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Confirm password</span>
              <Input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="h-8"
              />
            </label>

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
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving..." : "Update password"}
              </Button>
              <Link
                to="/login?mode=signin"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
