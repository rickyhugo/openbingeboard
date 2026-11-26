import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useProfile } from "~/components/profile-provider";
import { RatingBadge } from "~/components/rating-badge";
import { posterUrl } from "~/lib/tmdb";

interface TitleSummary {
  id: string;
  name: string;
  year: number | null;
  kind: "movie" | "series";
  posterPath: string | null;
  imdbScore: number | null;
}

export function ProfileTitleList({
  ids,
  mode,
  empty,
}: {
  ids: string[];
  mode: "watched" | "want";
  empty: string;
}) {
  const { toggleWatched, toggleWant } = useProfile();
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) {
      setTitles([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch("/api/titles?ids=" + encodeURIComponent(key), {
      signal: controller.signal,
    })
      .then(
        (response) => response.json() as Promise<{ titles?: TitleSummary[] }>,
      )
      .then((data) => {
        setTitles(data.titles ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key]);

  if (ids.length === 0) {
    return <p className="py-6 text-xs text-muted-foreground">{empty}</p>;
  }

  if (loading && titles.length === 0) {
    return <p className="py-6 text-xs text-muted-foreground">Loading...</p>;
  }

  if (titles.length === 0) {
    return (
      <p className="py-6 text-xs text-muted-foreground">
        These titles are not in the current catalogue.
      </p>
    );
  }

  return (
    <ul className="divide-y border">
      {titles.map((title) => {
        const poster = posterUrl(title.posterPath, "w185");
        return (
          <li
            key={title.id}
            className="flex items-center gap-3 p-2 transition-colors hover:bg-muted/40"
          >
            <Link
              to={"/title/" + encodeURIComponent(title.id)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="h-14 w-10 shrink-0 overflow-hidden border bg-muted">
                {poster ? (
                  <img
                    src={poster}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{title.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {title.year ?? "-"}
                </p>
              </div>
              {title.imdbScore !== null ? (
                <RatingBadge source="imdb" score={title.imdbScore} scale={10} />
              ) : null}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                mode === "watched"
                  ? toggleWatched(title.id)
                  : toggleWant(title.id)
              }
            >
              Remove
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
