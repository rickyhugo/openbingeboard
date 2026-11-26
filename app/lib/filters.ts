export const REGION = "SE";
export const PAGE_SIZE = 24;
export const MAX_PAGE = 500;

export const SORTS = ["rating", "year", "popularity", "title"] as const;
export type Sort = (typeof SORTS)[number];

export const MONETIZATIONS = ["all", "flatrate", "rent", "buy"] as const;
export type Monetization = (typeof MONETIZATIONS)[number];

export const KINDS = ["all", "movie", "series"] as const;
export type Kind = (typeof KINDS)[number];

export const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960] as const;

export interface Filters {
  q: string;
  providers: number[];
  genre: number | null;
  decade: number | null;
  monetization: Monetization;
  kind: Kind;
  minRating: number;
  sort: Sort;
  page: number;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  providers: [],
  genre: null,
  decade: null,
  monetization: "all",
  kind: "all",
  minRating: 0,
  sort: "rating",
  page: 1,
};

export const SORT_LABELS: Record<Sort, string> = {
  rating: "Best rated",
  year: "Newest",
  popularity: "Popular",
  title: "A to Z",
};

export const MONETIZATION_LABELS: Record<Monetization, string> = {
  all: "Any access",
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
};

export const KIND_LABELS: Record<Kind, string> = {
  all: "Films and series",
  movie: "Films",
  series: "Series",
};

const oneOf = <T extends string>(
  values: readonly T[],
  value: string | null,
  fallback: T,
): T => (values.includes(value as T) ? (value as T) : fallback);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const numberList = (value: string | null): number[] => {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ].slice(0, 20);
};

export function parseFilters(requestUrl: string): Filters {
  const params = new URL(requestUrl).searchParams;

  const rawRating = Number(params.get("minRating"));
  const rawPage = Number(params.get("page"));
  const rawGenre = Number(params.get("genre"));
  const rawDecade = Number(params.get("decade"));

  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    providers: numberList(params.get("providers") ?? params.get("provider")),
    genre: Number.isInteger(rawGenre) && rawGenre > 0 ? rawGenre : null,
    decade: DECADES.includes(rawDecade as (typeof DECADES)[number])
      ? rawDecade
      : null,
    monetization: oneOf(
      MONETIZATIONS,
      params.get("monetization"),
      DEFAULT_FILTERS.monetization,
    ),
    kind: oneOf(KINDS, params.get("kind"), DEFAULT_FILTERS.kind),
    minRating: Number.isFinite(rawRating)
      ? clamp(Math.round(rawRating * 10) / 10, 0, 10)
      : 0,
    sort: oneOf(SORTS, params.get("sort"), DEFAULT_FILTERS.sort),
    page: Number.isInteger(rawPage) ? clamp(rawPage, 1, MAX_PAGE) : 1,
  };
}

export function toSearchParams(
  filters: Filters,
  patch: Partial<Filters> = {},
): URLSearchParams {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.providers.length > 0) {
    params.set("providers", next.providers.join(","));
  }
  if (next.genre) params.set("genre", String(next.genre));
  if (next.decade) params.set("decade", String(next.decade));
  if (next.monetization !== "all") {
    params.set("monetization", next.monetization);
  }
  if (next.kind !== "all") params.set("kind", next.kind);
  if (next.minRating > 0) params.set("minRating", String(next.minRating));
  if (next.sort !== "rating") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  return params;
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.q !== "" ||
    filters.providers.length > 0 ||
    filters.genre !== null ||
    filters.decade !== null ||
    filters.monetization !== "all" ||
    filters.kind !== "all" ||
    filters.minRating > 0 ||
    filters.sort !== "rating"
  );
}

export function activeFilterCount(filters: Filters): number {
  return [
    filters.q !== "",
    filters.providers.length > 0,
    filters.genre !== null,
    filters.decade !== null,
    filters.monetization !== "all",
    filters.kind !== "all",
    filters.minRating > 0,
    filters.sort !== "rating",
  ].filter(Boolean).length;
}
