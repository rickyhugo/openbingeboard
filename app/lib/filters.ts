export const REGION = "SE";
export const PAGE_SIZE = 24;
export const MAX_PAGE = 500;

export const SORTS = ["rating", "year", "popularity", "title"] as const;
export type Sort = (typeof SORTS)[number];

export const MONETIZATIONS = ["all", "flatrate", "rent", "buy"] as const;
export type Monetization = (typeof MONETIZATIONS)[number];

export const KINDS = ["all", "movie", "series"] as const;
export type Kind = (typeof KINDS)[number];

export interface Filters {
  q: string;
  provider: number | null;
  monetization: Monetization;
  kind: Kind;
  minRating: number;
  sort: Sort;
  page: number;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  provider: null,
  monetization: "all",
  kind: "all",
  minRating: 0,
  sort: "rating",
  page: 1,
};

const oneOf = <T extends string>(
  values: readonly T[],
  value: string | null,
  fallback: T,
): T => (values.includes(value as T) ? (value as T) : fallback);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function parseFilters(requestUrl: string): Filters {
  const params = new URL(requestUrl).searchParams;

  const rawProvider = Number(params.get("provider"));
  const rawRating = Number(params.get("minRating"));
  const rawPage = Number(params.get("page"));

  return {
    q: (params.get("q") ?? "").trim().slice(0, 80),
    provider:
      Number.isInteger(rawProvider) && rawProvider > 0 ? rawProvider : null,
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
  if (next.provider) params.set("provider", String(next.provider));
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
    filters.provider !== null ||
    filters.monetization !== "all" ||
    filters.kind !== "all" ||
    filters.minRating > 0 ||
    filters.sort !== "rating"
  );
}

export const MONETIZATION_LABELS: Record<
  Exclude<Monetization, "all">,
  string
> = {
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
};
