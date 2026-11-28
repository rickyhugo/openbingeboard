import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "~/components/ui/button";
import { TitleCard } from "~/components/title-card";
import type { CountryCode } from "~/lib/countries";
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface LibraryResponse {
  titles?: TitleRow[];
  offers?: Record<string, OfferRow[]>;
}

export function LibraryGrid({
  ids,
  region,
  empty,
}: {
  ids: string[];
  region: CountryCode;
  empty: string;
}) {
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
  }, [key, region]);

  const ordered = useMemo(() => {
    const byId = new Map(titles.map((title) => [title.id, title]));
    return ids
      .map((id) => byId.get(id))
      .filter((title): title is TitleRow => title !== undefined);
  }, [ids, titles]);

  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 border border-dashed border-border bg-card/40 p-8 md:p-12">
        <span className="grid size-11 place-items-center bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={Bookmark02Icon}
            strokeWidth={1.8}
            className="size-5"
          />
        </span>
        <div>
          <p className="text-base font-semibold">Nothing here yet.</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {empty}
          </p>
        </div>
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
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[2/3] animate-pulse bg-muted" />
            <div className="h-3 w-3/4 animate-pulse bg-muted" />
            <div className="h-2.5 w-1/2 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <p className=" border border-dashed border-border bg-card/40 p-8 text-sm text-muted-foreground">
        These titles are not in the current catalogue.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
