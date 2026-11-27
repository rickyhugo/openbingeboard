import { useEffect, useState, type FormEvent } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useProfile } from "~/components/profile-provider";
import { authClient } from "~/lib/auth-client";
import type { loader as rootLoader } from "~/root";

function Message({ error, children }: { error: boolean; children: string }) {
  if (!children) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={
        "mt-2 text-[11px] " +
        (error ? "text-destructive" : "text-muted-foreground")
      }
    >
      {children}
    </p>
  );
}

export function AccountPanel() {
  const profile = useProfile();
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const revalidator = useRevalidator();
  const user = profile.user;

  const [name, setName] = useState(user?.name ?? "");
  const [namePending, setNamePending] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [verifyPending, setVerifyPending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyError, setVerifyError] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  if (!user) return null;

  const email = user.email;
  const emailEnabled = data?.emailEnabled ?? false;

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameMessage("");
    setNameError(false);
    const next = name.trim().slice(0, 80);
    if (!next) {
      setNameMessage("Enter a display name.");
      setNameError(true);
      return;
    }

    setNamePending(true);
    try {
      const result = await authClient.updateUser({ name: next });
      if (result.error) {
        setNameMessage(result.error.message ?? "Could not update your name.");
        setNameError(true);
        return;
      }
      setNameMessage("Name updated.");
      void revalidator.revalidate();
    } catch {
      setNameMessage("Could not update your name.");
      setNameError(true);
    } finally {
      setNamePending(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError(false);

    if (newPassword.length < 8) {
      setPasswordMessage("Use at least 8 characters.");
      setPasswordError(true);
      return;
    }

    setPasswordPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setPasswordMessage(
          result.error.message ?? "Could not change your password.",
        );
        setPasswordError(true);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated. Other sessions were signed out.");
    } catch {
      setPasswordMessage("Could not change your password.");
      setPasswordError(true);
    } finally {
      setPasswordPending(false);
    }
  }

  async function signOut() {
    await authClient.signOut().catch(() => {});
    profile.reset();
    window.location.assign("/");
  }

  async function resendVerification() {
    setVerifyMessage("");
    setVerifyError(false);
    setVerifyPending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/profile",
      });
      if (result.error) {
        setVerifyMessage(
          result.error.message ?? "Could not send the verification email.",
        );
        setVerifyError(true);
        return;
      }
      setVerifyMessage("Verification email sent.");
    } catch {
      setVerifyMessage("Could not send the verification email.");
      setVerifyError(true);
    } finally {
      setVerifyPending(false);
    }
  }

  return (
    <section id="account" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your sign-in details and password.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.emailVerified ? "secondary" : "outline"}>
            {user.emailVerified ? "Email verified" : "Email unverified"}
          </Badge>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="border p-4">
          <h3 className="text-xs font-semibold">Profile</h3>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {user.email}
          </p>

          <form onSubmit={saveName} className="mt-4 space-y-2">
            <label
              htmlFor="display-name"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Display name
            </label>
            <Input
              id="display-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              className="h-8"
            />
            <Button
              type="submit"
              size="sm"
              disabled={namePending || name.trim() === user.name}
            >
              {namePending ? "Saving..." : "Save name"}
            </Button>
            <Message error={nameError}>{nameMessage}</Message>
          </form>

          {!user.emailVerified ? (
            <div className="mt-4 border-t pt-3">
              <p className="text-[11px] text-muted-foreground">
                Verify your email to secure password recovery.
              </p>
              {emailEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={verifyPending}
                  onClick={resendVerification}
                >
                  {verifyPending ? "Sending..." : "Resend verification"}
                </Button>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Email delivery is not configured.
                </p>
              )}
              <Message error={verifyError}>{verifyMessage}</Message>
            </div>
          ) : null}
        </div>

        <div className="border p-4">
          <h3 className="text-xs font-semibold">Password</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Changing your password signs out other sessions.
          </p>

          <form onSubmit={changePassword} className="mt-4 space-y-2">
            <label
              htmlFor="current-password"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Current password
            </label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="h-8"
            />
            <label
              htmlFor="new-password"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-8"
            />
            <Button
              type="submit"
              size="sm"
              disabled={
                passwordPending || !currentPassword || newPassword.length < 8
              }
            >
              {passwordPending ? "Updating..." : "Change password"}
            </Button>
            <Message error={passwordError}>{passwordMessage}</Message>
          </form>
        </div>
      </div>
    </section>
  );
}
