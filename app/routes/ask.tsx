import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { TitleCard } from "~/components/title-card";
import { useProfile } from "~/components/profile-provider";
import { Button } from "~/components/ui/button";
import {
  EMBEDDING_DOWNLOAD_BYTES,
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
} from "~/lib/ai/embedding";
import {
  embedQuery,
  subscribeToEmbeddingProgress,
  warmupEmbeddingModel,
  type EmbeddingProgress,
} from "~/lib/ai/embedding-client";
import { cn } from "~/lib/utils";
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface SearchResult {
  titles: TitleRow[];
  offers: Record<string, OfferRow[]>;
}

type Kind = "all" | "movie" | "series";

const STORAGE_KEY = "obb:semantic-search";
const EXAMPLES = [
  "A quiet science fiction film",
  "Something like Arrival but lighter",
  "A short crime series from the 90s",
  "A funny film for a rainy Sunday",
];

export function meta() {
  return [{ title: "Ask · OpenBingeBoard" }];
}

export default function Ask() {
  const { state, hydrated } = useProfile();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<EmbeddingProgress>({
    loaded: 0,
    total: 0,
  });
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [allServices, setAllServices] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "1";
    setEnabled(stored);
    if (!stored) return;

    setLoading(true);
    warmupEmbeddingModel()
      .catch(() => {
        // A failed warmup is retried by the next search.
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return subscribeToEmbeddingProgress(setProgress);
  }, []);

  async function enable() {
    setError("");
    setLoading(true);
    setProgress({ loaded: 0, total: 0 });

    try {
      await warmupEmbeddingModel();
      localStorage.setItem(STORAGE_KEY, "1");
      setEnabled(true);
    } catch {
      setError(
        "Could not load the model. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 3) {
      setError("Describe what you want in a few words.");
      return;
    }

    setPending(true);
    setError("");
    setResult(null);
    setStatus("Preparing the local model...");

    try {
      const vector = await embedQuery(text);
      setStatus("Searching the catalogue...");

      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          model: EMBEDDING_MODEL_KEY,
          dim: EMBEDDING_MODEL.dim,
          kind: kind === "all" ? undefined : kind,
          services: allServices ? [] : state.services,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Search failed.");
      }

      setResult((await response.json()) as SearchResult);
      setStatus("");
    } catch (cause) {
      setStatus("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Search failed. Try a shorter description.",
      );
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const total = progress.total || EMBEDDING_DOWNLOAD_BYTES;
  const percent = Math.min(100, Math.round((progress.loaded / total) * 100));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Semantic search
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Ask the catalogue
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Describe a mood, story, or constraint. The model runs in your browser.
        </p>
      </div>

      {enabled === null ? null : enabled ? (
        <>
          <form onSubmit={submit} className="mt-6 max-w-3xl">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. a tense Scandinavian crime series, or something like Arrival but lighter"
              aria-label="Describe what you want to watch"
              maxLength={300}
              rows={3}
              className="w-full resize-none border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={pending || loading}>
                {pending ? "Searching..." : "Search"}
              </Button>

              <div className="flex items-center border font-mono text-[10px] uppercase tracking-wider">
                {(["all", "movie", "series"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                    className={cn(
                      "px-2 py-1 transition-colors",
                      kind === value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "all"
                      ? "All"
                      : value === "movie"
                        ? "Movies"
                        : "Series"}
                  </button>
                ))}
              </div>

              {hydrated && state.services.length > 0 ? (
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-foreground"
                    checked={allServices}
                    onChange={(event) => setAllServices(event.target.checked)}
                  />
                  Include services outside my selection
                </label>
              ) : null}
              <Link
                to="/"
                className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Browse catalogue
              </Link>
            </div>
          </form>

          <div className="mt-4 flex max-w-3xl flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="border px-2 py-1 text-left font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>

          <p className="mt-4 max-w-2xl text-[11px] text-muted-foreground">
            The model runs on this device. Your description stays here; only the
            vector is sent. Press {"⌘"}/Ctrl + Enter to search.
          </p>
        </>
      ) : (
        <section className="mt-6 max-w-2xl border p-5">
          <h2 className="text-sm font-semibold">Turn on semantic search</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The BGE model and ONNX runtime download once, about{" "}
            {Math.round(EMBEDDING_DOWNLOAD_BYTES / 1_000_000)} MB. Your browser
            caches them. Your description stays on this device; only the
            384-number query vector is sent.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={enable}
            disabled={loading}
          >
            {loading ? "Downloading..." : "Enable semantic search"}
          </Button>
        </section>
      )}

      {loading ? (
        <div className="mt-6 max-w-md" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between font-mono text-[10px] text-muted-foreground">
            <span>
              {progress.loaded > 0 ? "Downloading model" : "Preparing model"}
            </span>
            <span>
              {Math.round(progress.loaded / 1_000_000)} /{" "}
              {Math.round(total / 1_000_000)} MB
            </span>
          </div>
          <div
            className="mt-1.5 h-1 w-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className="h-1 bg-foreground transition-[width] duration-200"
              style={{ width: percent + "%" }}
            />
          </div>
        </div>
      ) : null}

      {status ? (
        <p className="mt-6 text-xs text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Closest matches
            </h2>
            <p className="font-mono text-[10px] text-muted-foreground">
              {result.titles.length} titles
            </p>
          </div>
          {result.titles.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {result.titles.map((title) => (
                <TitleCard
                  key={title.id}
                  title={title}
                  offers={result.offers[title.id] ?? []}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 border border-dashed p-6 text-xs text-muted-foreground">
              No close matches. Try a broader description or{" "}
              <Link
                to="/"
                className="underline underline-offset-4 hover:text-foreground"
              >
                browse the catalogue
              </Link>
              .
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
