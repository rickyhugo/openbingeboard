import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { AuthStatus } from "~/components/auth-status";
import { ProfileTitleList } from "~/components/profile-title-list";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import type { loader as rootLoader } from "~/root";

export function meta() {
  return [{ title: "My profile · OpenBingeBoard" }];
}

export default function Profile() {
  const profile = useProfile();
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const providers = data?.providers ?? [];
  const navigate = useNavigate();
  const { state } = profile;
  const servicesQuery =
    state.services.length > 0 ? "/?providers=" + state.services.join(",") : "/";

  function surprise() {
    const pool = state.want.length > 0 ? state.want : state.watched;
    if (pool.length === 0) return;
    const id = pool[Math.floor(Math.random() * pool.length)];
    navigate("/title/" + encodeURIComponent(id));
  }

  if (!profile.hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">My profile</h1>
        <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose your services, save useful views, and keep track of what you
            watched.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuthStatus />
          <Button
            variant="outline"
            size="sm"
            onClick={surprise}
            disabled={state.watched.length === 0 && state.want.length === 0}
          >
            Surprise me
          </Button>
        </div>
      </div>

      {!profile.user ? (
        <p className="mt-3 border border-dashed p-3 text-xs text-muted-foreground">
          Browsing as a guest. Your lists stay in this browser.{" "}
          <Link
            to="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Sign in to sync
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Watched", state.watched.length],
          ["Want to watch", state.want.length],
          ["Services", state.services.length],
          ["Saved views", state.saved.length],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section id="services" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">My services</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Used for the quick service toggles and your catalogue shortcuts.
            </p>
          </div>
          <Link
            to={servicesQuery}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Browse my services
          </Link>
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-1 border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <label
              key={provider.id}
              className="flex items-center justify-between gap-3 py-1.5 text-xs"
            >
              <span className="truncate">{provider.name}</span>
              <input
                type="checkbox"
                className="size-3.5 accent-foreground"
                checked={profile.hasService(provider.id)}
                onChange={() => profile.toggleService(provider.id)}
                aria-label={provider.name}
              />
            </label>
          ))}
        </div>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-sm font-semibold">Saved views</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Save a filter combination from the catalogue, then open it here or in
          the sidebar.
        </p>
        {state.saved.length === 0 ? (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            No saved views yet. Set some filters on the catalogue and choose
            Save view.
          </p>
        ) : (
          <ul className="mt-3 divide-y border">
            {state.saved.map((filter) => (
              <li
                key={filter.id}
                className="flex items-center justify-between gap-3 p-2"
              >
                <Link
                  to={"/" + filter.query}
                  className="min-w-0 flex-1 text-xs font-medium hover:underline"
                >
                  {filter.name}
                </Link>
                <span className="hidden max-w-[45%] truncate font-mono text-[10px] text-muted-foreground sm:block">
                  {filter.query || "/"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => profile.removeFilter(filter.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator className="my-8" />

      <section>
        <Tabs defaultValue="watched">
          <TabsList>
            <TabsTrigger value="watched">
              Watched ({state.watched.length})
            </TabsTrigger>
            <TabsTrigger value="want">
              Want to watch ({state.want.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="watched" className="pt-3">
            <ProfileTitleList
              ids={state.watched}
              mode="watched"
              empty="Mark a title as watched from its detail page."
            />
          </TabsContent>
          <TabsContent value="want" className="pt-3">
            <ProfileTitleList
              ids={state.want}
              mode="want"
              empty="Mark a title as want to watch from its detail page."
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
