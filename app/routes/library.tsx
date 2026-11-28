import { data, Link, useNavigate, useRouteLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { LibraryGrid } from "~/components/library-grid";
import { Button, buttonVariants } from "~/components/ui/button";
import { useProfile } from "~/components/profile-provider";
import { cn } from "cn";
import type { loader as rootLoader } from "~/root";
import type { Route } from "./+types/library";

export async function loader({ params }: Route.LoaderArgs) {
  if (params.mode !== "watched" && params.mode !== "want") {
    throw data("Not found", { status: 404 });
  }
  return { mode: params.mode };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const mode = loaderData?.mode ?? "watched";
  return [
    {
      title:
        (mode === "watched" ? "Watched" : "Want to watch") +
        " · OpenBingeBoard",
    },
  ];
}

export default function Library({ loaderData }: Route.ComponentProps) {
  const { mode } = loaderData;
  const navigate = useNavigate();
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const country = root?.country ?? "SE";
  const { state, hydrated } = useProfile();
  const ids = mode === "watched" ? state.watched : state.want;
  const orderedIds = [...ids].reverse();
  const label = mode === "watched" ? "Watched" : "Want to watch";

  function surprise() {
    if (ids.length === 0) return;
    const id = ids[Math.floor(Math.random() * ids.length)];
    navigate("/title/" + encodeURIComponent(id));
  }

  return (
    <main>
      <section className="border-b border-border/70">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 md:pt-12">
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {hydrated
                  ? ids.length +
                    (ids.length === 1 ? " title saved." : " titles saved.")
                  : "Loading..."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={surprise}
                disabled={!hydrated || ids.length === 0}
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                Surprise me
              </Button>
              <Link
                to="/"
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                Browse catalogue
              </Link>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center border border-border bg-card/60 p-0.5">
            <Link
              to="/library/watched"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 px-3 text-[11px] font-medium transition-colors",
                mode === "watched"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="size-3.5"
              />
              Watched
              <span className="opacity-60">{state.watched.length}</span>
            </Link>
            <Link
              to="/library/want"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 px-3 text-[11px] font-medium transition-colors",
                mode === "want"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon
                icon={Bookmark02Icon}
                strokeWidth={2}
                className="size-3.5"
              />
              Want to watch
              <span className="opacity-60">{state.want.length}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        {hydrated ? (
          <LibraryGrid
            ids={orderedIds}
            region={country}
            empty={
              mode === "watched"
                ? "Mark titles as watched from their detail pages and they will show up here."
                : "Add titles to your watchlist from their detail pages and they will show up here."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="aspect-[2/3] animate-pulse bg-muted" />
                <div className="h-3 w-3/4 animate-pulse bg-muted" />
                <div className="h-2.5 w-1/2 animate-pulse bg-muted" />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
