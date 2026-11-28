import { Link } from "react-router";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
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
  stats,
}: {
  rating: RatingRow;
  stats: ImdbStats | null;
}) {
  const percent = Math.max(
    2,
    Math.min(100, (rating.score / rating.scale) * 100),
  );
  const imdb = rating.source === "imdb";
  const buckets =
    imdb && stats
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
        className="rounded-none align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={"Show " + LABELS[rating.source] + " score details"}
      >
        <RatingBadge
          source={rating.source}
          score={rating.score}
          scale={rating.scale}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <PopoverHeader>
          <PopoverTitle className="flex items-baseline justify-between gap-3">
            <span>{LABELS[rating.source]}</span>
            <span className="font-mono text-lg">
              {formatScore(rating.score, rating.scale, rating.source)}
            </span>
          </PopoverTitle>
          <PopoverDescription>{votes(rating.votes)}</PopoverDescription>
        </PopoverHeader>

        {imdb && stats ? (
          <p className="text-[11px] text-muted-foreground">
            Higher than {stats.percentile}% of {stats.total} rated titles in
            this catalogue.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-muted">
            <div
              className="h-full bg-foreground"
              style={{ width: percent + "%" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {rating.scale === 100 ? "Out of 100." : "Out of 10."}
          </p>
        </div>

        {imdb && stats ? (
          <div className="space-y-1.5 border-t pt-2">
            <p className="text-[10px] text-muted-foreground">
              IMDb scores in this catalogue
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
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              The highlighted bar is this title.
            </p>
          </div>
        ) : null}

        {rating.url ? (
          <Link
            to={rating.url}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open on {LABELS[rating.source]}
            <ArrowUpRight weight="bold" className="size-3" />
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
