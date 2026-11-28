import type { RatingRow } from "~/server/queries.server";
import type { ImdbStats } from "~/server/extras.server";
import { formatScore, RatingBadge } from "~/components/rating-badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";

const LABELS: Record<RatingRow["source"], string> = {
  imdb: "IMDb",
  rt: "Rotten Tomatoes",
  metacritic: "Metacritic",
  tmdb: "TMDB",
};

function votes(value: number | null) {
  if (value === null) return "No vote count";
  return new Intl.NumberFormat("en-US").format(value) + " votes";
}

export function ScorePopover({
  rating,
  ratings,
  stats,
}: {
  rating: RatingRow;
  ratings: readonly RatingRow[];
  stats: ImdbStats | null;
}) {
  const buckets = stats
    ? Array.from({ length: 11 }, (_, bucket) => {
        const entry = stats.histogram.find((item) => item.bucket === bucket);
        return entry?.count ?? 0;
      })
    : [];
  const max = Math.max(1, ...buckets);
  const currentBucket = Math.floor(rating.score);

  return (
    <Popover>
      <PopoverTrigger
        className="rounded-none align-middle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        aria-label={"Show " + LABELS[rating.source] + " score details"}
      >
        <RatingBadge
          source={rating.source}
          score={rating.score}
          scale={rating.scale}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <PopoverHeader>
          <PopoverTitle className="flex items-baseline justify-between gap-3">
            <span>{LABELS[rating.source]}</span>
            <span className="font-mono text-lg">
              {formatScore(rating.score, rating.scale, rating.source)}
            </span>
          </PopoverTitle>
          <PopoverDescription>{votes(rating.votes)}</PopoverDescription>
        </PopoverHeader>

        {stats && rating.source === "imdb" ? (
          <p className="text-[11px] text-muted-foreground">
            Higher than {stats.percentile}% of {stats.total} rated titles in
            this catalogue.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            All sources
          </p>
          {ratings.map((item) => {
            const percent =
              item.scale === 100 ? item.score : (item.score / 10) * 100;
            return (
              <div key={item.source} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span>{LABELS[item.source]}</span>
                  <span className="font-mono">
                    {formatScore(item.score, item.scale, item.source)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: Math.max(2, Math.min(100, percent)) + "%" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {votes(item.votes)}
                </p>
              </div>
            );
          })}
        </div>

        {stats ? (
          <div className="space-y-1.5 border-t pt-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              IMDb score distribution
            </p>
            <div className="flex h-20 items-end gap-[2px]">
              {buckets.map((count, bucket) => (
                <div
                  key={bucket}
                  className={
                    "flex-1 " +
                    (bucket === currentBucket
                      ? "bg-foreground"
                      : "bg-muted-foreground/30")
                  }
                  style={{ height: Math.max(2, (count / max) * 100) + "%" }}
                  title={bucket + ": " + count + " titles"}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Number of catalogue titles per score bucket. The highlighted bar
              is this title.
            </p>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
