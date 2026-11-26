import { cn } from "cn";
import { Badge } from "~/components/ui/badge";

const SOURCE_LABELS = {
  imdb: "IMDb",
  rt: "RT",
  metacritic: "MC",
  tmdb: "TMDB",
} as const;

const SOURCE_STYLES = {
  imdb: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rt: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  metacritic:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  tmdb: "border-border bg-muted text-muted-foreground",
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
        "gap-1 font-mono text-[10px] tracking-tight",
        tone === "overlay" ? OVERLAY_STYLE : SOURCE_STYLES[source],
        className,
      )}
      title={`${SOURCE_LABELS[source]} ${formatScore(score, scale, source)}`}
    >
      <span className="opacity-70">{SOURCE_LABELS[source]}</span>
      <span className="font-semibold">{formatScore(score, scale, source)}</span>
    </Badge>
  );
}
