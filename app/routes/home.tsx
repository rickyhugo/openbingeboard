import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "~/components/ui/button";
import { FilterBar } from "~/components/filter-bar";
import { TitleCard } from "~/components/title-card";
import { EMBEDDING_MODEL, EMBEDDING_MODEL_KEY } from "~/lib/ai/embedding";
import { embedQuery } from "~/lib/ai/embedding-client";
import { parseQueryConstraints } from "~/lib/ai/query";
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
import type { OfferRow, TitleRow } from "~/server/queries.server";
import type { Route } from "./+types/home";

interface SemanticResult {
  titles: TitleRow[];
  offers: Record<string, OfferRow[]>;
  reference: {
    id: string;
    name: string;
    year: number | null;
    kind: "movie" | "series";
  } | null;
}

export function meta() {
  const description =
    "Search films and series by keyword, or describe what you feel like watching. Compare streaming, rental, and purchase options with IMDb, Rotten Tomatoes, and Metacritic scores.";

  return [
    { title: "Where to stream movies and series · OpenBingeBoard" },
    { name: "description", content: description },
    {
      property: "og:title",
      content: "Where to stream movies and series · OpenBingeBoard",
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
  const location = useLocation();

  const [enhanced, setEnhanced] = useState<SemanticResult | null>(null);
  const [refining, setRefining] = useState(false);

  // Keyword results come from the full-text index on the server. When a query
  // reads like a description, the browser re-ranks it by meaning once the
  // local model is ready.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q")?.trim() ?? "";
    if (!q) {
      setEnhanced(null);
      setRefining(false);
      return;
    }

    const constraints = parseQueryConstraints(q);
    if (constraints.text.length < 3) return;

    const needsMeaning =
      constraints.reference !== null ||
      constraints.minRating > 0 ||
      constraints.decade !== undefined ||
      result.titles.length <= 3 ||
      q.split(/\s+/).filter(Boolean).length >= 5;

    if (!needsMeaning) {
      setEnhanced(null);
      setRefining(false);
      return;
    }

    let cancelled = false;
    setRefining(true);

    (async () => {
      try {
        const vector = await embedQuery(constraints.text);
        const response = await fetch("/api/search/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vector,
            model: EMBEDDING_MODEL_KEY,
            dim: EMBEDDING_MODEL.dim,
            kind: filters.kind !== "all" ? filters.kind : constraints.kind,
            minRating: Math.max(constraints.minRating, filters.minRating),
            decade: constraints.decade ?? filters.decade ?? undefined,
            genre: filters.genre ?? undefined,
            monetization:
              filters.monetization !== "all" ? filters.monetization : undefined,
            reference: constraints.reference,
            services: filters.providers,
          }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as SemanticResult;
        if (!cancelled) setEnhanced(data);
      } catch {
        // The exact matches stay up when meaning-based ranking is unavailable.
      } finally {
        if (!cancelled) setRefining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const titles = enhanced ? enhanced.titles : result.titles;
  const offers = enhanced ? enhanced.offers : result.offers;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {active ? (
        <section className="shrink-0 border-b border-border/70">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                Results in {countryName(country)}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {enhanced
                  ? `${enhanced.titles.length} matches`
                  : `${result.total} ${result.total === 1 ? "title" : "titles"}`}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="shrink-0 border-b border-border/70">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="eyebrow">
              {active ? "Filtered" : "All titles"} / {sorted}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {refining
                ? "refining results…"
                : enhanced
                  ? `${enhanced.titles.length} matches for your description`
                  : `page ${filters.page} of ${result.pageCount}`}
            </p>
          </div>

          {enhanced?.reference ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Anchored to{" "}
              <Link
                to={"/title/" + encodeURIComponent(enhanced.reference.id)}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {enhanced.reference.name}
              </Link>
            </p>
          ) : null}

          {titles.length === 0 ? (
            <div className="mt-6 flex flex-col items-start gap-4 border border-dashed border-border bg-card/40 p-8 md:p-12">
              <span className="grid size-11 place-items-center bg-muted text-muted-foreground">
                <MagnifyingGlass weight="regular" className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold">
                  {refining
                    ? "No exact matches."
                    : enhanced
                      ? "No close matches."
                      : active
                        ? "Nothing matches those filters."
                        : "No titles for " + countryName(country) + " yet."}
                </p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {refining
                    ? "Looking for close matches. This can take a moment on first use."
                    : "Try a broader description, a wider rating range, or choose another country in the sidebar."}
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
              {titles.map((title) => (
                <TitleCard
                  key={title.id}
                  title={title}
                  offers={offers[title.id] ?? []}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {result.pageCount > 1 && !enhanced && (
        <nav className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <Link
            to={pageHref(filters, Math.max(1, filters.page - 1))}
            aria-disabled={filters.page <= 1}
            className={`${buttonVariants({ variant: "outline", size: "sm" })} ${
              filters.page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <ArrowLeft weight="bold" />
            Previous
          </Link>
          <span className="text-[11px] text-muted-foreground">
            Page {filters.page} of {result.pageCount}
          </span>
          <Link
            to={pageHref(filters, Math.min(result.pageCount, filters.page + 1))}
            aria-disabled={filters.page >= result.pageCount}
            className={`${buttonVariants({ variant: "default", size: "sm" })} ${
              filters.page >= result.pageCount
                ? "pointer-events-none opacity-40"
                : ""
            }`}
          >
            Next
            <ArrowRight weight="bold" />
          </Link>
        </nav>
      )}
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
