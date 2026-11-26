import { env } from "cloudflare:workers";
import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { FilterBar } from "~/components/filter-bar";
import { TitleCard } from "~/components/title-card";
import {
  hasActiveFilters,
  parseFilters,
  toSearchParams,
  type Filters,
} from "~/lib/filters";
import { runQuery } from "~/server/effect.server";
import { listProviders, listTitles } from "~/server/queries.server";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "OpenBingeBoard · What to watch in Sweden" },
    {
      name: "description",
      content:
        "Browse films and series streaming, renting, or on sale in Sweden. Filter by service and rating.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const filters = parseFilters(request.url);
  const [result, providers] = await Promise.all([
    runQuery(listTitles(env.REGION, filters)),
    runQuery(listProviders),
  ]);

  return { filters, providers, result };
}

const SORT_LABELS: Record<Filters["sort"], string> = {
  rating: "best rated",
  year: "newest",
  popularity: "most popular",
  title: "A to Z",
};

function pageHref(filters: Filters, page: number): string {
  const params = toSearchParams(filters, { page });
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { filters, providers, result } = loaderData;
  const active = hasActiveFilters(filters);
  const sorted = SORT_LABELS[filters.sort];

  return (
    <main>
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 grid-noise opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Region SE / Sweden / nightly refresh
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Everything worth watching in Sweden, and where to watch it.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Streaming, rental, and purchase availability combined with IMDb,
            Rotten Tomatoes, and Metacritic scores. One list, no subscriptions.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>
              <span className="text-foreground">{result.total}</span> titles
            </span>
            <span>
              <span className="text-foreground">{providers.length}</span>{" "}
              services
            </span>
            <span>
              provider data <span className="text-foreground">JustWatch</span>
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <FilterBar filters={filters} providers={providers} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {active ? "Filtered" : "All titles"} / {sorted}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            page {filters.page} of {result.pageCount}
          </p>
        </div>

        {result.titles.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border border-dashed p-8">
            <p className="text-sm font-medium">
              Nothing matches those filters.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Try a wider rating range, another service, or clear the search
              box. Availability changes every night.
            </p>
            <Link
              to="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {result.titles.map((title) => (
              <TitleCard
                key={title.id}
                title={title}
                offers={result.offers[title.id] ?? []}
              />
            ))}
          </div>
        )}

        {result.pageCount > 1 && (
          <nav className="mt-8 flex items-center justify-between border-t pt-4">
            <Link
              to={pageHref(filters, Math.max(1, filters.page - 1))}
              aria-disabled={filters.page <= 1}
              className={`${buttonVariants({ variant: "outline", size: "sm" })} ${
                filters.page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Previous
            </Link>
            <span className="font-mono text-[11px] text-muted-foreground">
              {filters.page} / {result.pageCount}
            </span>
            <Link
              to={pageHref(
                filters,
                Math.min(result.pageCount, filters.page + 1),
              )}
              aria-disabled={filters.page >= result.pageCount}
              className={`${buttonVariants({ variant: "outline", size: "sm" })} ${
                filters.page >= result.pageCount
                  ? "pointer-events-none opacity-40"
                  : ""
              }`}
            >
              Next
            </Link>
          </nav>
        )}
      </section>
    </main>
  );
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The catalogue query failed. Try again in a moment.
      </p>
      <Link
        to="/"
        className={`${buttonVariants({ variant: "default", size: "sm" })} mt-4`}
      >
        Back to the catalogue
      </Link>
    </main>
  );
}
