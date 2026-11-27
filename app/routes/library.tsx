import { data, Link, useNavigate } from "react-router";
import { LibraryGrid } from "~/components/library-grid";
import { Button, buttonVariants } from "~/components/ui/button";
import { useProfile } from "~/components/profile-provider";
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your library
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{label}</h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {mode === "watched"
              ? "Films and series you have finished."
              : "What you plan to watch next."}{" "}
            {hydrated ? ids.length + " saved." : "Loading..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={surprise}
            disabled={!hydrated || ids.length === 0}
          >
            Surprise me
          </Button>
          <Link
            to="/"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Browse catalogue
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {hydrated ? (
          <LibraryGrid
            ids={orderedIds}
            empty={
              mode === "watched"
                ? "Mark a title as watched from its detail page and it will appear here."
                : "Mark a title as want to watch from its detail page and it will appear here."
            }
          />
        ) : (
          <p className="py-8 text-xs text-muted-foreground">Loading...</p>
        )}
      </div>
    </main>
  );
}
