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
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="poster-shadow relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-border/70 transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:ring-primary/30">
        {poster ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-secondary font-display text-4xl text-muted-foreground">
            {initials(title.name)}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
          <div className="flex flex-wrap gap-1">
            {title.imdbScore !== null && (
              <RatingBadge
                source="imdb"
                score={title.imdbScore}
                scale={10}
                tone="overlay"
              />
            )}
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-black/55 text-[9px] tracking-[0.12em] text-white uppercase backdrop-blur-md"
          >
            {title.kind === "series" ? "Series" : "Film"}
          </Badge>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-1 p-2">
          {uniqueProviders.slice(0, 1).map((offer) => (
            <ProviderChip
              key={`${offer.providerId}-${offer.monetization}`}
              name={offer.providerName}
              monetization={offer.monetization}
              compact
              tone="overlay"
            />
          ))}
          {uniqueProviders.length > 1 && (
            <span className="inline-flex h-5 items-center rounded-full border border-white/15 bg-black/55 px-2 text-[10px] text-white backdrop-blur-md">
              +{uniqueProviders.length - 1}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-[13px] leading-tight font-medium transition-colors group-hover:text-primary">
          {title.name}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {title.year ?? "—"} · {title.kind === "series" ? "Series" : "Film"}
          {uniqueProviders.length > 0
            ? " · " +
              uniqueProviders.length +
              (uniqueProviders.length === 1 ? " service" : " services")
            : ""}
        </p>
      </div>
    </Link>
  );
}
