import { Link } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

export function AuthStatus() {
  const { user, reset } = useProfile();

  async function signOut() {
    await authClient.signOut().catch(() => {});
    reset();
    window.location.assign("/");
  }

  if (!user) {
    return (
      <div className="px-2 py-1 text-[11px] text-muted-foreground">
        <Link
          to="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign in to sync
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1">
      <span className="min-w-0 truncate text-[11px] text-muted-foreground">
        {user.email}
      </span>
      <Button variant="ghost" size="xs" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
