import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { ProviderChip } from "~/components/provider-chip";
import { RatingBadge } from "~/components/rating-badge";
import type { OfferRow, TitleRow } from "~/server/queries.server";
import { initials, posterUrl } from "~/lib/tmdb";

export function TitleCard({
  title,
  offers,
}: {
  title: TitleRow;
  offers: OfferRow[];
}) {
  const poster = posterUrl(title.posterPath);
  const uniqueProviders = offers.filter(
    (offer, index, all) =>
      all.findIndex((other) => other.providerId === offer.providerId) === index,
  );

  return (
    <Link
      to={`/title/${encodeURIComponent(title.id)}`}
      prefetch="intent"
      className="group block focus-visible:outline-none"
    >
      <div className="relative aspect-[2/3] overflow-hidden border bg-muted">
        {poster ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover grayscale-[15%] transition duration-300 group-hover:scale-[1.02] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-2xl text-muted-foreground">
            {initials(title.name)}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 bg-gradient-to-b from-black/70 to-transparent p-1.5 pb-6">
          <div className="flex flex-wrap gap-1">
            {title.imdbScore !== null && (
              <RatingBadge
                source="imdb"
                score={title.imdbScore}
                scale={10}
                tone="overlay"
              />
            )}
            {title.rtScore !== null && (
              <RatingBadge
                source="rt"
                score={title.rtScore}
                scale={100}
                tone="overlay"
                className="hidden sm:inline-flex"
              />
            )}
          </div>
          <Badge
            variant="outline"
            className="border-white/30 bg-black/40 font-mono text-[9px] text-white uppercase tracking-widest"
          >
            {title.kind === "series" ? "Series" : "Film"}
          </Badge>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6">
          <div className="flex flex-wrap gap-1">
            {uniqueProviders.slice(0, 1).map((offer) => (
              <ProviderChip
                key={`${offer.providerId}-${offer.monetization}`}
                name={offer.providerName}
                monetization={offer.monetization}
                compact
                className="border-white/20 bg-black/80 text-white"
              />
            ))}
            {uniqueProviders.length > 1 && (
              <span className="inline-flex h-5 items-center border border-white/20 bg-black/80 px-1.5 font-mono text-[10px] text-white">
                +{uniqueProviders.length - 1}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <p className="truncate text-xs font-medium group-hover:underline">
          {title.name}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {title.year ?? "—"}
          {title.tmdbVote !== null && (
            <span className="ml-2 opacity-70">
              TMDB {title.tmdbVote.toFixed(1)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
