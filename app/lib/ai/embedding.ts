export const EMBEDDING_MODEL = {
  id: "Xenova/bge-small-en-v1.5",
  dim: 384,
  dtype: "q8",
  queryPrefix: "Represent this sentence for searching relevant passages: ",
} as const;

export function queryEmbeddingText(query: string): string {
  return EMBEDDING_MODEL.queryPrefix + query.trim();
}

export function documentEmbeddingText(input: {
  name: string;
  originalName: string | null;
  year: number | null;
  kind: "movie" | "series";
  genres: readonly string[];
  overview: string | null;
}): string {
  return [
    "Title: " + input.name,
    input.originalName && input.originalName !== input.name
      ? "Original title: " + input.originalName
      : null,
    input.year ? "Year: " + input.year : null,
    "Type: " + (input.kind === "series" ? "Series" : "Movie"),
    input.genres.length > 0 ? "Genres: " + input.genres.join(", ") : null,
    input.overview ? "Overview: " + input.overview : null,
  ]
    .filter(Boolean)
    .join("\n");
}
