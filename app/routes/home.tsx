import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { FilterBar } from "~/components/filter-bar";
import { TitleCard } from "~/components/title-card";
import { countryFromRequest } from "~/lib/country.server";
import { countryName } from "~/lib/countries";
import {
  hasActiveFilters,
  parseFilters,
  SORT_LABELS,
  toSearchParams,
  type Filters,
} from "~/lib/filters";
import { runQuery } from "~/server/effect.server";
import { listGenres } from "~/server/extras.server";
import { listProviders, listTitles } from "~/server/queries.server";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  const country = loaderData?.country;
  const name = country ? countryName(country) : "the Nordics";
  return [
    { title: "OpenBingeBoard · What to watch in " + name },
    {
      name: "description",
      content:
        "Browse films and series streaming, renting, or on sale in " +
        name +
        ". Filter by service and rating.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const filters = parseFilters(request.url);
  const country = countryFromRequest(request);
  const [result, providers, genres] = await Promise.all([
    runQuery(listTitles(country, filters)),
    runQuery(listProviders(country)),
    runQuery(listGenres),
  ]);

  return { filters, country, providers, genres, result };
}

function pageHref(filters: Filters, page: number): string {
  const params = toSearchParams(filters, { page });
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { filters, country, providers, genres, result } = loaderData;
  const active = hasActiveFilters(filters);
  const sorted = SORT_LABELS[filters.sort];

  return (
    <main>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Films and series available in {countryName(country)}
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Find where to stream, rent, or buy, with IMDb, Rotten Tomatoes, and
            Metacritic scores in one view.
          </p>
        </div>
      </section>

      <FilterBar filters={filters} providers={providers} genres={genres} />

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
              {active
                ? "Nothing matches those filters."
                : "No titles for " + countryName(country) + " yet."}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Try a wider rating range, another service, clear the search box,
              or choose another country in the sidebar. Availability changes
              every night.
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
