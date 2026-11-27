import { data, isRouteErrorResponse, Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { ProviderChip } from "~/components/provider-chip";
import { ScorePopover } from "~/components/score-popover";
import { TitleActions } from "~/components/title-actions";
import { countryFromRequest } from "~/lib/country.server";
import { countryName } from "~/lib/countries";
import { formatRuntime, imdbUrl, initials, posterUrl } from "~/lib/tmdb";
import { runQuery } from "~/server/effect.server";
import { getImdbStats } from "~/server/extras.server";
import { getTitle } from "~/server/queries.server";
import type { Route } from "./+types/title";

const OFFER_GROUPS = [
  { key: "flatrate", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "ads", label: "Free with ads" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
] as const;

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.title.name ?? "Title";
  const country = loaderData?.country;
  return [
    { title: `${name} · OpenBingeBoard` },
    {
      name: "description",
      content: `Where to watch ${name} in ${country ? countryName(country) : "the Nordics"}, with IMDb and Rotten Tomatoes scores.`,
    },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const country = countryFromRequest(request);
  const title = await runQuery(getTitle(country, params.id));

  if (!title) {
    throw data("Title not found", { status: 404 });
  }

  const imdb = title.ratings.find((rating) => rating.source === "imdb");
  const stats = imdb ? await runQuery(getImdbStats(imdb.score)) : null;

  return { title, stats, country };
}

export default function Title({ loaderData }: Route.ComponentProps) {
  const { title, stats, country } = loaderData;
  const poster = posterUrl(title.posterPath, "w500");
  const runtime = formatRuntime(title.runtime);
  const imdb = imdbUrl(title.imdbId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/"
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        ← Back to the catalogue
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden border bg-muted">
            {poster ? (
              <img
                src={poster}
                alt={`Poster for ${title.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-3xl text-muted-foreground">
                {initials(title.name)}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
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

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-[9px] uppercase tracking-widest"
            >
              {title.kind === "series" ? "Series" : "Film"}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              {[
                title.year,
                runtime
                  ? title.kind === "series"
                    ? `${runtime}/ep`
                    : runtime
                  : null,
              ]
                .filter(Boolean)
                .join(" / ")}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {title.name}
          </h1>

          {title.originalName && title.originalName !== title.name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {title.originalName}
            </p>
          )}

          {title.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {title.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {title.overview && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {title.overview}
            </p>
          )}

          <TitleActions titleId={title.id} />

          {imdb && (
            <a
              href={imdb}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-mono text-[10px] uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Open on IMDb
            </a>
          )}

          <section className="mt-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Where to watch in {countryName(country)}
            </h2>

            {title.offers.length === 0 ? (
              <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
                No Swedish availability recorded right now. It may have left a
                service since the last refresh.
              </p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {OFFER_GROUPS.map((group) => {
                  const offers = title.offers.filter(
                    (offer) => offer.monetization === group.key,
                  );
                  if (offers.length === 0) return null;

                  return (
                    <div key={group.key} className="border">
                      <div className="border-b bg-muted/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {group.label}
                      </div>
                      <ul>
                        {offers.map((offer) => (
                          <li
                            key={`${offer.providerId}-${offer.monetization}`}
                            className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                          >
                            <ProviderChip
                              name={offer.providerName}
                              monetization={offer.monetization}
                            />
                            {offer.link && (
                              <a
                                href={offer.link}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:underline"
                              >
                                Open
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {notFound ? "404" : "Error"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
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
