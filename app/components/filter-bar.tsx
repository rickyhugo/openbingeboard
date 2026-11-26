import { Link } from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import { hasActiveFilters, type Filters } from "~/lib/filters";
import type { ProviderRow } from "~/server/queries.server";

const RATING_OPTIONS = [0, 6, 7, 8, 9];

export function FilterBar({
  filters,
  providers,
}: {
  filters: Filters;
  providers: readonly ProviderRow[];
}) {
  return (
    <form
      method="get"
      className="flex flex-col gap-2 border-b bg-background/95 py-3 backdrop-blur md:flex-row md:items-center"
    >
      <Input
        type="search"
        name="q"
        defaultValue={filters.q}
        placeholder="Search titles, people, moods..."
        aria-label="Search titles"
        className="h-8 md:max-w-xs"
      />

      <NativeSelect
        name="provider"
        defaultValue={filters.provider ?? ""}
        aria-label="Streaming service"
        className="w-full md:w-auto"
      >
        <NativeSelectOption value="">All services</NativeSelectOption>
        {providers.map((provider) => (
          <NativeSelectOption key={provider.id} value={provider.id}>
            {provider.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        name="monetization"
        defaultValue={filters.monetization}
        aria-label="How to watch"
        className="w-full md:w-auto"
      >
        <NativeSelectOption value="all">Any access</NativeSelectOption>
        <NativeSelectOption value="flatrate">Stream</NativeSelectOption>
        <NativeSelectOption value="rent">Rent</NativeSelectOption>
        <NativeSelectOption value="buy">Buy</NativeSelectOption>
      </NativeSelect>

      <NativeSelect
        name="kind"
        defaultValue={filters.kind}
        aria-label="Type"
        className="w-full md:w-auto"
      >
        <NativeSelectOption value="all">Films & series</NativeSelectOption>
        <NativeSelectOption value="movie">Films</NativeSelectOption>
        <NativeSelectOption value="series">Series</NativeSelectOption>
      </NativeSelect>

      <NativeSelect
        name="minRating"
        defaultValue={filters.minRating || ""}
        aria-label="Minimum IMDb rating"
        className="w-full md:w-auto"
      >
        <NativeSelectOption value="">Any rating</NativeSelectOption>
        {RATING_OPTIONS.filter(Boolean).map((rating) => (
          <NativeSelectOption key={rating} value={rating}>
            IMDb {rating}.0+
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        name="sort"
        defaultValue={filters.sort}
        aria-label="Sort order"
        className="w-full md:w-auto"
      >
        <NativeSelectOption value="rating">Best rated</NativeSelectOption>
        <NativeSelectOption value="year">Newest</NativeSelectOption>
        <NativeSelectOption value="popularity">Popular</NativeSelectOption>
        <NativeSelectOption value="title">A to Z</NativeSelectOption>
      </NativeSelect>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="flex-1 md:flex-none">
          Apply
        </Button>
        {hasActiveFilters(filters) && (
          <Link
            to="/"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} font-mono text-[10px] uppercase tracking-wider`}
          >
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
