const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null,
  size: "w185" | "w342" | "w500" = "w342",
): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function initials(value: string): string {
  return value
    .replace(/^(the|a|an)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function imdbUrl(imdbId: string | null): string | null {
  return imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;
}

export const ATTRIBUTION = {
  tmdb: "https://www.themoviedb.org/",
  justWatch: "https://www.justwatch.com/",
  omdb: "https://www.omdbapi.com/",
} as const;
