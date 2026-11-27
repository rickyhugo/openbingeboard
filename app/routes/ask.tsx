import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
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
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface SearchResult {
  titles: TitleRow[];
  offers: Record<string, OfferRow[]>;
}

type Kind = "all" | "movie" | "series";

const STORAGE_KEY = "obb:semantic-search";
const KINDS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Series" },
] as const;
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
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-12">
      <section className="page-glow relative overflow-hidden rounded-2xl border border-border/70 p-6 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">Semantic search</p>
            <h1 className="mt-2 font-display text-4xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
              Describe it.{" "}
              <span className="text-primary italic">We will find it.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              A mood, a plot, a constraint. Ask runs a small model in your
              browser and searches the catalogue by meaning, not just title.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            On device
          </span>
        </div>

        {enabled === null ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl border border-border bg-card/50" />
        ) : enabled ? (
          <form onSubmit={submit} className="mt-7">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. a tense Scandinavian crime series, or something like Arrival but lighter"
                aria-label="Describe what you want to watch"
                maxLength={300}
                rows={3}
                className="min-h-[112px] w-full resize-none bg-transparent p-4 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-8 items-center rounded-full border border-border bg-background/60 p-0.5">
                    {KINDS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKind(option.value)}
                        aria-pressed={kind === option.value}
                        className={cn(
                          "h-7 rounded-full px-2.5 text-[11px] font-medium transition-colors",
                          kind === option.value
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {hydrated && state.services.length > 0 ? (
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        checked={allServices}
                        onChange={(event) =>
                          setAllServices(event.target.checked)
                        }
                      />
                      Include services outside my selection
                    </label>
                  ) : null}
                </div>

                <Button type="submit" disabled={pending || loading}>
                  {pending ? "Searching..." : "Search"}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              The model runs on this device. Your description stays here; only
              the vector is sent. Press {"⌘"}/Ctrl + Enter to search.
            </p>
          </form>
        ) : (
          <div className="mt-7 rounded-xl border border-primary/20 bg-primary/[0.05] p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-5"
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  Turn on semantic search
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-6 text-muted-foreground">
                  The BGE model and ONNX runtime download once, about{" "}
                  {Math.round(EMBEDDING_DOWNLOAD_BYTES / 1_000_000)} MB. Your
                  browser caches them. Your description stays on this device;
                  only the 384-number query vector is sent.
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={enable}
                  disabled={loading}
                >
                  {loading ? "Downloading..." : "Enable semantic search"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 max-w-md" role="status" aria-live="polite">
            <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
              <span>
                {progress.loaded > 0 ? "Downloading model" : "Preparing model"}
              </span>
              <span>
                {Math.round(progress.loaded / 1_000_000)} /{" "}
                {Math.round(total / 1_000_000)} MB
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: percent + "%" }}
              />
            </div>
          </div>
        ) : null}
      </section>

      {status ? (
        <p className="mt-5 text-xs text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Closest matches</p>
              <h2 className="mt-1 font-display text-3xl tracking-tight">
                {result.titles.length > 0
                  ? "Start with these"
                  : "Nothing close"}
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {result.titles.length} titles
            </p>
          </div>

          {result.titles.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
              {result.titles.map((title) => (
                <TitleCard
                  key={title.id}
                  title={title}
                  offers={result.offers[title.id] ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-card/40 p-8">
              <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={1.8}
                  className="size-5"
                />
              </span>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                No close matches. Try a broader description or{" "}
                <Link
                  to="/"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  browse the catalogue
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
