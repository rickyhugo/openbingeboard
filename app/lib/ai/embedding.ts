export const MODEL_ORIGIN = "https://models.openbingeboard.com/";
export const ONNX_RUNTIME_VERSION = "1.31.0-dev.20260914-8d85527a0";

export const EMBEDDING_MODEL = {
  id: "Xenova/bge-small-en-v1.5",
  // Pinned so the vectors in D1 always describe the files served from R2.
  revision: "ea104dacec62c0de699686887e3f920caeb4f3e3",
  dim: 384,
  dtype: "q8",
  queryPrefix: "Represent this sentence for searching relevant passages: ",
} as const;

// Changing the revision or dtype changes the key, so stored vectors never mix
// with vectors from a different model.
export const EMBEDDING_MODEL_KEY =
  EMBEDDING_MODEL.id +
  "@" +
  EMBEDDING_MODEL.revision +
  "#" +
  EMBEDDING_MODEL.dtype;

// Sum of the model, tokenizer, and ONNX runtime files. Used only to show
// download progress before the first file reports its size.
export const EMBEDDING_DOWNLOAD_BYTES = 61_600_000;

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
