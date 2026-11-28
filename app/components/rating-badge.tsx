import { cn } from "cn";
import { Badge } from "~/components/ui/badge";

const SOURCE_LABELS = {
  imdb: "IMDb",
  rt: "RT",
  metacritic: "MC",
  tmdb: "TMDB",
} as const;

const OVERLAY_STYLE = "border-white/20 bg-black/80 text-white";

export function formatScore(
  score: number,
  scale: number,
  source: keyof typeof SOURCE_LABELS,
): string {
  if (source === "rt" || source === "metacritic") {
    return `${Math.round((score / scale) * 100)}%`;
  }
  return (score / (scale / 10)).toFixed(1);
}

export function RatingBadge({
  source,
  score,
  scale,
  tone = "default",
  className,
}: {
  source: keyof typeof SOURCE_LABELS;
  score: number;
  scale: number;
  tone?: "default" | "overlay";
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        tone === "overlay"
          ? OVERLAY_STYLE
          : "border-border bg-muted text-foreground",
        className,
      )}
      title={`${SOURCE_LABELS[source]} ${formatScore(score, scale, source)}`}
    >
      <span className="opacity-70">{SOURCE_LABELS[source]}</span>
      <span className="font-semibold">{formatScore(score, scale, source)}</span>
    </Badge>
  );
}
