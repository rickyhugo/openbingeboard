import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { TitleCard } from "~/components/title-card";
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface LibraryResponse {
  titles?: TitleRow[];
  offers?: Record<string, OfferRow[]>;
}

export function LibraryGrid({ ids, empty }: { ids: string[]; empty: string }) {
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [offers, setOffers] = useState<Record<string, OfferRow[]>>({});
  const [loading, setLoading] = useState(false);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) {
      setTitles([]);
      setOffers({});
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setTitles([]);
    setOffers({});
    fetch("/api/titles?offers=1&ids=" + encodeURIComponent(key), {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<LibraryResponse>)
      .then((data) => {
        setTitles(data.titles ?? []);
        setOffers(data.offers ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key]);

  const ordered = useMemo(() => {
    const byId = new Map(titles.map((title) => [title.id, title]));
    return ids
      .map((id) => byId.get(id))
      .filter((title): title is TitleRow => title !== undefined);
  }, [ids, titles]);

  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-dashed p-8">
        <p className="text-sm font-medium">Nothing here yet.</p>
        <p className="max-w-md text-xs text-muted-foreground">{empty}</p>
        <Link
          to="/"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  if (loading && ordered.length === 0) {
    return <p className="py-8 text-xs text-muted-foreground">Loading...</p>;
  }

  if (ordered.length === 0) {
    return (
      <p className="border border-dashed p-8 text-xs text-muted-foreground">
        These titles are not in the current catalogue.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {ordered.map((title) => (
        <TitleCard
          key={title.id}
          title={title}
          offers={offers[title.id] ?? []}
        />
      ))}
    </div>
  );
}
