import { Link, useLocation } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

export function AuthActions({ compact = false }: { compact?: boolean }) {
  const { user, reset } = useProfile();
  const location = useLocation();
  const current =
    location.pathname === "/" || location.pathname === "/login"
      ? "/profile"
      : location.pathname + location.search;
  const next = encodeURIComponent(current);

  if (
    location.pathname === "/login" ||
    location.pathname === "/reset-password"
  ) {
    return null;
  }

  async function signOut() {
    await authClient.signOut().catch(() => {});
    reset();
    window.location.assign("/");
  }

  if (!user) {
    return (
      <div
        className={
          compact
            ? "flex items-center gap-2 px-2 py-1"
            : "flex items-center gap-2"
        }
      >
        <Link
          to={`/login?mode=signin&next=${next}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Log in
        </Link>
        <Link
          to={`/login?mode=signup&next=${next}`}
          className={buttonVariants({ size: "sm" })}
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex items-center justify-between gap-2 px-2 py-1"
          : "flex items-center gap-2"
      }
    >
      {compact ? (
        <span className="min-w-0 truncate text-[11px] text-muted-foreground">
          {user.email}
        </span>
      ) : (
        <Link
          to="/profile"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "hidden sm:inline-flex",
          })}
        >
          My profile
        </Link>
      )}
      <Button variant="outline" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
