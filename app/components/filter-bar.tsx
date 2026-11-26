import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  DECADES,
  hasActiveFilters,
  KIND_LABELS,
  MONETIZATION_LABELS,
  SORT_LABELS,
  toSearchParams,
  type Filters,
} from "~/lib/filters";
import type { GenreRow } from "~/server/extras.server";
import type { ProviderRow } from "~/server/queries.server";

const RATING_OPTIONS = [9, 8, 7, 6];

export function FilterBar({
  filters,
  providers,
  genres,
}: {
  filters: Filters;
  providers: readonly ProviderRow[];
  genres: readonly GenreRow[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hydrated, saveFilter } = useProfile();
  const [query, setQuery] = useState(filters.q);
  const [viewName, setViewName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [serviceDraft, setServiceDraft] = useState(filters.providers);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setQuery(filters.q), [filters.q]);
  useEffect(() => {
    setServiceDraft(filters.providers);
  }, [filters.providers.join(",")]);

  function apply(patch: Partial<Filters>) {
    const params = toSearchParams(filters, { ...patch, page: 1 });
    const search = params.toString();
    navigate(search ? "/?" + search : "/");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ q: query });
  }

  const providerName = (id: number) =>
    providers.find((provider) => provider.id === id)?.name ?? String(id);
  const genreName = (id: number) =>
    genres.find((genre) => genre.id === id)?.name ?? String(id);

  const chips: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (filters.q) {
    chips.push({ key: "q", label: "Search: " + filters.q, clear: { q: "" } });
  }
  for (const id of filters.providers) {
    chips.push({
      key: "provider-" + id,
      label: providerName(id),
      clear: {
        providers: filters.providers.filter((provider) => provider !== id),
      },
    });
  }
  if (filters.genre) {
    chips.push({
      key: "genre",
      label: genreName(filters.genre),
      clear: { genre: null },
    });
  }
  if (filters.decade) {
    chips.push({
      key: "decade",
      label: filters.decade + "s",
      clear: { decade: null },
    });
  }
  if (filters.monetization !== "all") {
    chips.push({
      key: "monetization",
      label: MONETIZATION_LABELS[filters.monetization],
      clear: { monetization: "all" },
    });
  }
  if (filters.kind !== "all") {
    chips.push({
      key: "kind",
      label: KIND_LABELS[filters.kind],
      clear: { kind: "all" },
    });
  }
  if (filters.minRating > 0) {
    chips.push({
      key: "rating",
      label: "IMDb " + filters.minRating + "+",
      clear: { minRating: 0 },
    });
  }

  return (
    <div className="sticky top-14 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={submitSearch}
            className="flex min-w-[15rem] flex-1 items-center gap-1.5"
          >
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles"
              aria-label="Search titles"
              className="h-8"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>

          <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
            <PopoverTrigger
              type="button"
              className={
                buttonVariants({ variant: "outline", size: "sm" }) +
                " max-w-[12rem]"
              }
            >
              <span className="truncate">
                {(() => {
                  const count = (
                    servicesOpen ? serviceDraft : filters.providers
                  ).length;
                  if (count === 0) return "All services";
                  return count + (count === 1 ? " service" : " services");
                })()}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Services
              </p>
              <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                {providers.map((provider) => (
                  <label
                    key={provider.id}
                    className="flex cursor-pointer items-center gap-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-foreground"
                      checked={serviceDraft.includes(provider.id)}
                      onChange={() =>
                        setServiceDraft((current) =>
                          current.includes(provider.id)
                            ? current.filter((id) => id !== provider.id)
                            : [...current, provider.id],
                        )
                      }
                    />
                    <span className="truncate">{provider.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setServiceDraft([]);
                    apply({ providers: [] });
                    setServicesOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    apply({ providers: serviceDraft });
                    setServicesOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? "Hide filters" : "Filters"}
          </Button>

          <div
            className={
              filtersOpen
                ? "flex w-full flex-wrap items-center gap-2 md:w-auto"
                : "hidden w-full flex-wrap items-center gap-2 md:flex md:w-auto"
            }
          >
            <NativeSelect
              value={filters.genre === null ? "" : String(filters.genre)}
              onChange={(event) =>
                apply({
                  genre: event.target.value ? Number(event.target.value) : null,
                })
              }
              aria-label="Genre"
              className="w-full sm:w-auto"
            >
              <NativeSelectOption value="">All genres</NativeSelectOption>
              {genres.map((genre) => (
                <NativeSelectOption key={genre.id} value={genre.id}>
                  {genre.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <NativeSelect
              value={filters.decade === null ? "" : String(filters.decade)}
              onChange={(event) =>
                apply({
                  decade: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              aria-label="Decade"
              className="w-full sm:w-auto"
            >
              <NativeSelectOption value="">Any year</NativeSelectOption>
              {DECADES.map((decade) => (
                <NativeSelectOption key={decade} value={decade}>
                  {decade}s
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <NativeSelect
              value={filters.monetization}
              onChange={(event) =>
                apply({
                  monetization: event.target.value as Filters["monetization"],
                })
              }
              aria-label="How to watch"
              className="w-full sm:w-auto"
            >
              <NativeSelectOption value="all">Any access</NativeSelectOption>
              <NativeSelectOption value="flatrate">Stream</NativeSelectOption>
              <NativeSelectOption value="rent">Rent</NativeSelectOption>
              <NativeSelectOption value="buy">Buy</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={filters.kind}
              onChange={(event) =>
                apply({ kind: event.target.value as Filters["kind"] })
              }
              aria-label="Type"
              className="w-full sm:w-auto"
            >
              <NativeSelectOption value="all">
                Films & series
              </NativeSelectOption>
              <NativeSelectOption value="movie">Films</NativeSelectOption>
              <NativeSelectOption value="series">Series</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={filters.minRating === 0 ? "" : String(filters.minRating)}
              onChange={(event) =>
                apply({
                  minRating: event.target.value
                    ? Number(event.target.value)
                    : 0,
                })
              }
              aria-label="Minimum IMDb rating"
              className="w-full sm:w-auto"
            >
              <NativeSelectOption value="">Any rating</NativeSelectOption>
              {RATING_OPTIONS.map((rating) => (
                <NativeSelectOption key={rating} value={rating}>
                  IMDb {rating}+
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <NativeSelect
              value={filters.sort}
              onChange={(event) =>
                apply({ sort: event.target.value as Filters["sort"] })
              }
              aria-label="Sort order"
              className="w-full sm:w-auto"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <Popover open={saveOpen} onOpenChange={setSaveOpen}>
              <PopoverTrigger
                type="button"
                disabled={!hydrated}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Save view
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <p className="text-xs font-medium">Save this view</p>
                <Input
                  value={viewName}
                  onChange={(event) => setViewName(event.target.value)}
                  placeholder="e.g. Netflix 8+"
                  className="h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!viewName.trim()}
                  onClick={() => {
                    saveFilter(viewName, location.search);
                    setViewName("");
                    setSaveOpen(false);
                  }}
                >
                  Save view
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters(filters) ? (
            <Link
              to="/"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Clear
            </Link>
          ) : null}
        </div>

        {chips.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => apply(chip.clear)}
                className="inline-flex h-5 items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="ml-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
