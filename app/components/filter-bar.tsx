import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  BookmarkSimple,
  CaretDown,
  Checks,
  Funnel,
  MagnifyingGlass,
  PlayCircle,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { ProviderLogo } from "~/components/provider-logo";
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

const KINDS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Series" },
] as const;

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
  const { state, hydrated, saveFilter } = useProfile();
  const [query, setQuery] = useState(filters.q);
  const [viewName, setViewName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [serviceDraft, setServiceDraft] = useState(filters.providers);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const advancedCount =
    (filters.genre !== null ? 1 : 0) +
    (filters.decade !== null ? 1 : 0) +
    (filters.monetization !== "all" ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  // "My services" preset: the services the user checked on their profile.
  const myServices = state.services.filter((id) =>
    providers.some((provider) => provider.id === id),
  );
  const myServicesActive =
    hydrated &&
    myServices.length > 0 &&
    filters.providers.length === myServices.length &&
    myServices.every((id) => filters.providers.includes(id));

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
    <div className="sticky top-16 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={submitSearch}
            className="relative w-full md:w-auto md:max-w-sm md:flex-1"
          >
            <MagnifyingGlass
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search or describe what you want to watch"
              aria-label="Search titles"
              enterKeyHint="search"
              className=" pr-10 pl-9"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ArrowRight weight="bold" className="size-3.5" />
            </button>
          </form>

          <div className="flex h-9 items-center border border-border bg-card/60 p-0.5">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => apply({ kind: option.value })}
                aria-pressed={filters.kind === option.value}
                className={cn(
                  "h-8 px-3 text-[11px] font-medium transition-colors",
                  filters.kind === option.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hydrated || myServices.length === 0}
            title={
              myServices.length === 0
                ? "Choose services first"
                : "Show only the services you checked"
            }
            aria-pressed={myServicesActive}
            onClick={() =>
              apply({
                providers: myServicesActive ? [] : myServices,
              })
            }
          >
            <Checks weight="bold" />
            My services
          </Button>

          <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
            <PopoverTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                myServicesActive && "border-foreground/40 bg-muted",
              )}
            >
              <PlayCircle weight="bold" />
              <span className="max-w-[9rem] truncate">
                {filters.providers.length === 0
                  ? "All services"
                  : filters.providers.length +
                    (filters.providers.length === 1 ? " service" : " services")}
              </span>
              <CaretDown weight="bold" className="size-3 opacity-50" />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 max-w-[calc(100vw-2rem)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Services</p>
                <button
                  type="button"
                  onClick={() => setServiceDraft([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                {providers.map((provider) => {
                  const checked = serviceDraft.includes(provider.id);
                  return (
                    <label
                      key={provider.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                        checked && "bg-muted/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 accent-foreground"
                        checked={checked}
                        onChange={() =>
                          setServiceDraft((current) =>
                            current.includes(provider.id)
                              ? current.filter((id) => id !== provider.id)
                              : [...current, provider.id],
                          )
                        }
                      />
                      <ProviderLogo
                        path={provider.logoPath}
                        name={provider.name}
                        className="h-5 w-5"
                      />
                      <span className="truncate">{provider.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-3">
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

          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Funnel weight="bold" />
              Filters
              {advancedCount > 0 ? (
                <span className="grid size-4 place-items-center bg-foreground text-[9px] font-semibold text-background">
                  {advancedCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 max-w-[calc(100vw-2rem)]"
            >
              <p className="text-sm font-semibold">Refine</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Genre
                  </span>
                  <NativeSelect
                    value={filters.genre === null ? "" : String(filters.genre)}
                    onChange={(event) =>
                      apply({
                        genre: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                    aria-label="Genre"
                    className="w-full"
                  >
                    <NativeSelectOption value="">All genres</NativeSelectOption>
                    {genres.map((genre) => (
                      <NativeSelectOption key={genre.id} value={genre.id}>
                        {genre.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Decade
                  </span>
                  <NativeSelect
                    value={
                      filters.decade === null ? "" : String(filters.decade)
                    }
                    onChange={(event) =>
                      apply({
                        decade: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                    aria-label="Decade"
                    className="w-full"
                  >
                    <NativeSelectOption value="">Any year</NativeSelectOption>
                    {DECADES.map((decade) => (
                      <NativeSelectOption key={decade} value={decade}>
                        {decade}s
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Access
                  </span>
                  <NativeSelect
                    value={filters.monetization}
                    onChange={(event) =>
                      apply({
                        monetization: event.target
                          .value as Filters["monetization"],
                      })
                    }
                    aria-label="How to watch"
                    className="w-full"
                  >
                    <NativeSelectOption value="all">
                      Any access
                    </NativeSelectOption>
                    <NativeSelectOption value="flatrate">
                      Stream
                    </NativeSelectOption>
                    <NativeSelectOption value="rent">Rent</NativeSelectOption>
                    <NativeSelectOption value="buy">Buy</NativeSelectOption>
                  </NativeSelect>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Rating
                  </span>
                  <NativeSelect
                    value={
                      filters.minRating === 0 ? "" : String(filters.minRating)
                    }
                    onChange={(event) =>
                      apply({
                        minRating: event.target.value
                          ? Number(event.target.value)
                          : 0,
                      })
                    }
                    aria-label="Minimum IMDb rating"
                    className="w-full"
                  >
                    <NativeSelectOption value="">Any rating</NativeSelectOption>
                    {RATING_OPTIONS.map((rating) => (
                      <NativeSelectOption key={rating} value={rating}>
                        IMDb {rating}+
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigate("/");
                    setMoreOpen(false);
                  }}
                >
                  Reset all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setMoreOpen(false)}
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <NativeSelect
            value={filters.sort}
            onChange={(event) =>
              apply({ sort: event.target.value as Filters["sort"] })
            }
            aria-label="Sort order"
            className="w-auto"
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
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <BookmarkSimple weight="bold" />
              Save
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <p className="text-sm font-semibold">Save this view</p>
              <p className="text-[11px] text-muted-foreground">
                Keep the current filters one click away.
              </p>
              <Input
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="e.g. Netflix 8+"
                aria-label="View name"
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

          {hasActiveFilters(filters) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {chips.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => apply(chip.clear)}
                className="inline-flex h-6 items-center gap-1 border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {chip.label}
                <X weight="bold" className="size-3 opacity-50" />
              </button>
            ))}
            <Link
              to="/"
              className="ml-1 text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
