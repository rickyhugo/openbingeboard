import { data, isRouteErrorResponse, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { ScorePopover } from "~/components/score-popover";
import { TitleActions } from "~/components/title-actions";
import { TitleOffers } from "~/components/title-offers";
import { countryFromRequest } from "~/lib/country.server";
import { countryName } from "~/lib/countries";
import { formatRuntime, imdbUrl, initials, posterUrl } from "~/lib/tmdb";
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { getImdbStats } from "~/server/extras.server";
import { getTitle } from "~/server/queries.server";
import type { Route } from "./+types/title";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.title.name ?? "Title";
  const description = `Find where you can stream ${name}. Compare rental and purchase options, with IMDb, Rotten Tomatoes, and Metacritic scores.`;

  return [
    { title: `${name} · Where to stream · OpenBingeBoard` },
    { name: "description", content: description },
    {
      property: "og:title",
      content: `${name} · Where to stream · OpenBingeBoard`,
    },
    { property: "og:description", content: description },
    { property: "og:site_name", content: "OpenBingeBoard" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const country = countryFromRequest(request);
  const title = await cached(`title:${country}:${params.id}`, 60_000, () =>
    runQuery(getTitle(country, params.id)),
  );

  if (!title) {
    throw data("Title not found", { status: 404 });
  }

  const imdb = title.ratings.find((rating) => rating.source === "imdb");
  const stats = imdb
    ? await cached(`imdb-stats:${imdb.score}`, 10 * 60_000, () =>
        runQuery(getImdbStats(imdb.score)),
      )
    : null;

  return { title, stats, country };
}

export default function Title({ loaderData }: Route.ComponentProps) {
  const { title, stats, country } = loaderData;
  const poster = posterUrl(title.posterPath, "w500");
  const runtime = formatRuntime(title.runtime);
  const imdb = imdbUrl(title.imdbId);
  const meta = [
    title.year,
    runtime ? (title.kind === "series" ? `${runtime}/ep` : runtime) : null,
  ].filter(Boolean);

  return (
    <main>
      <section className="border-b border-border/70">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 md:pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            All titles
          </Link>

          <div className="mt-7 grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] lg:gap-12">
            <div className="mx-auto w-full max-w-[220px] md:mx-0 md:max-w-none">
              <div className="aspect-[2/3] overflow-hidden border bg-muted">
                {poster ? (
                  <img
                    src={poster}
                    alt={`Poster for ${title.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted text-2xl text-muted-foreground">
                    {initials(title.name)}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {title.ratings.map((rating) => (
                  <ScorePopover
                    key={rating.source}
                    rating={rating}
                    ratings={title.ratings}
                    stats={stats}
                  />
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                <Badge
                  variant="outline"
                  className="tracking-[0.12em] uppercase"
                >
                  {title.kind === "series" ? "Series" : "Film"}
                </Badge>
                {meta.map((value, index) => (
                  <span key={value} className="flex items-center gap-2.5">
                    {index > 0 ? <span className="opacity-40">·</span> : null}
                    {value}
                  </span>
                ))}
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                {title.name}
              </h1>

              {title.originalName && title.originalName !== title.name ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {title.originalName}
                </p>
              ) : null}

              {title.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {title.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {title.overview && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-[15px]">
                  {title.overview}
                </p>
              )}

              <TitleActions titleId={title.id} />

              {imdb && (
                <a
                  href={imdb}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Open on IMDb
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    strokeWidth={2}
                    className="size-3"
                  />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <p className="eyebrow">Where to watch in {countryName(country)}</p>

        {title.offers.length === 0 ? (
          <div className="mt-4 border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            No availability in {countryName(country)} recorded right now. It may
            have left a service since the last refresh.
          </div>
        ) : (
          <TitleOffers offers={title.offers} />
        )}
      </section>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="eyebrow">{notFound ? "404" : "Error"}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {notFound
          ? "That title is not in the catalogue."
          : "Something went wrong."}
      </h1>
      <Link
        to="/"
        className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4`}
      >
        Back to the catalogue
      </Link>
    </main>
  );
}
