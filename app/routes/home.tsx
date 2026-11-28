import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
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
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { listGenres } from "~/server/extras.server";
import { listProviders, listTitles } from "~/server/queries.server";
import type { Route } from "./+types/home";

export function meta() {
  const description =
    "Find where you can stream movies and series. Compare rental and purchase options, with IMDb, Rotten Tomatoes, and Metacritic scores.";

  return [
    { title: "Where to stream movies and series · OpenBingeBoard" },
    { name: "description", content: description },
    {
      property: "og:title",
      content: "Find where you can stream movies and series · OpenBingeBoard",
    },
    { property: "og:description", content: description },
    { property: "og:site_name", content: "OpenBingeBoard" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const filters = parseFilters(request.url);
  const country = countryFromRequest(request);
  const [result, providers, genres] = await Promise.all([
    cached(`catalogue:${country}:${JSON.stringify(filters)}`, 60_000, () =>
      runQuery(listTitles(country, filters)),
    ),
    cached(`providers:${country}`, 5 * 60_000, () =>
      runQuery(listProviders(country)),
    ),
    cached("genres", 60 * 60_000, () => runQuery(listGenres)),
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
      {active ? (
        <section className="border-b border-border/70">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                Results in {countryName(country)}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {result.total} {result.total === 1 ? "title" : "titles"}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-border/70">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <h1 className="text-xl font-semibold tracking-tight">
              Films and series available in {countryName(country)}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Stream, rent, or buy, with IMDb, Rotten Tomatoes, and Metacritic
              scores in one place.
            </p>
          </div>
        </section>
      )}

      <FilterBar filters={filters} providers={providers} genres={genres} />

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="eyebrow">
            {active ? "Filtered" : "All titles"} / {sorted}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            page {filters.page} of {result.pageCount}
          </p>
        </div>

        {result.titles.length === 0 ? (
          <div className="mt-6 flex flex-col items-start gap-4 border border-dashed border-border bg-card/40 p-8 md:p-12">
            <span className="grid size-11 place-items-center bg-muted text-muted-foreground">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.8}
                className="size-5"
              />
            </span>
            <div>
              <p className="text-base font-semibold">
                {active
                  ? "Nothing matches those filters."
                  : "No titles for " + countryName(country) + " yet."}
              </p>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Try a wider rating range, another service, clear the search box,
                or choose another country in the sidebar.
              </p>
            </div>
            <Link
              to="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
          <nav className="mt-10 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
            <Link
              to={pageHref(filters, Math.max(1, filters.page - 1))}
              aria-disabled={filters.page <= 1}
              className={`${buttonVariants({ variant: "outline", size: "sm" })} ${
                filters.page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              Previous
            </Link>
            <span className="text-[11px] text-muted-foreground">
              Page {filters.page} of {result.pageCount}
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
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
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
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong.
      </h1>
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
