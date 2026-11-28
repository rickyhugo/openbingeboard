import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
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
import { parseQueryConstraints, type QueryConstraints } from "~/lib/ai/query";
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface SearchResult {
  titles: TitleRow[];
  offers: Record<string, OfferRow[]>;
  reference: {
    id: string;
    name: string;
    year: number | null;
    kind: "movie" | "series";
  } | null;
}

type Kind = "all" | "movie" | "series";

const STORAGE_KEY = "obb:semantic-search";
const MAX_QUERY = 400;
const TEXTAREA_MAX_HEIGHT = 240;
const KINDS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Series" },
] as const;
const EXAMPLES = [
  "Similar to Breaking Bad, but with a female lead, +7 IMDb",
  "A quiet science fiction film",
  "Something like Arrival but lighter",
  "A short crime series from the 90s",
  "A funny film for a rainy Sunday",
];

export function meta() {
  const description =
    "Describe a mood, story, or constraint and search the catalogue by meaning. Ask runs a local model, respects your country and services, and understands rating, decade, and title comparisons.";

  return [
    { title: "Ask the catalogue · OpenBingeBoard" },
    { name: "description", content: description },
    { property: "og:title", content: "Ask the catalogue · OpenBingeBoard" },
    { property: "og:description", content: description },
  ];
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
  const [applied, setApplied] = useState<QueryConstraints | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height =
      Math.min(element.scrollHeight, TEXTAREA_MAX_HEIGHT) + "px";
  }, [query]);

  useEffect(() => {
    if (!result) return;
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [result]);

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
    const constraints = parseQueryConstraints(query);
    if (constraints.text.length < 3) {
      setError("Describe what you want in a few words.");
      return;
    }

    const effectiveKind = kind !== "all" ? kind : constraints.kind;

    setPending(true);
    setError("");
    setResult(null);
    setApplied(constraints);
    setStatus("Preparing the local model...");

    try {
      const vector = await embedQuery(constraints.text);
      setStatus("Searching the catalogue...");

      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          model: EMBEDDING_MODEL_KEY,
          dim: EMBEDDING_MODEL.dim,
          kind: effectiveKind,
          minRating: constraints.minRating,
          decade: constraints.decade,
          reference: constraints.reference,
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
  const constraints = parseQueryConstraints(query);
  const effectiveKind = kind !== "all" ? kind : constraints.kind;
  const detected = [
    constraints.minRating > 0 ? "IMDb " + constraints.minRating + "+" : null,
    effectiveKind ? (effectiveKind === "series" ? "Series" : "Films") : null,
    constraints.decade ? constraints.decade + "s" : null,
    constraints.reference ? "Like " + constraints.reference : null,
  ].filter((label): label is string => label !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-12">
      <section className=" border border-border p-5 md:p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Ask the catalogue
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Describe a mood, story, or constraint. The model runs in your browser.
        </p>

        {enabled === null ? (
          <div className="mt-6 h-32 animate-pulse border border-border bg-muted/40" />
        ) : enabled ? (
          <form onSubmit={submit} className="mt-5">
            <div className="overflow-hidden border border-border bg-card shadow-sm">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. a tense Scandinavian crime series, or something like Arrival but lighter"
                aria-label="Describe what you want to watch"
                maxLength={MAX_QUERY}
                rows={3}
                enterKeyHint="search"
                className="max-h-[240px] min-h-[96px] w-full resize-none overflow-y-auto bg-transparent p-3.5 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-8 items-center border border-border bg-background/60 p-0.5">
                    {KINDS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKind(option.value)}
                        aria-pressed={kind === option.value}
                        className={cn(
                          "h-7 px-2.5 text-[11px] font-medium transition-colors",
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
                        className="size-3.5 accent-foreground"
                        checked={allServices}
                        onChange={(event) =>
                          setAllServices(event.target.checked)
                        }
                      />
                      Include services outside my selection
                    </label>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">
                    {query.length}/{MAX_QUERY}
                  </span>
                  <Button type="submit" size="sm" disabled={pending || loading}>
                    {pending ? "Searching..." : "Search"}
                    <ArrowRight weight="bold" className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {query.trim().length > 0 && detected.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  Understood
                </span>
                {detected.map((label) => (
                  <span
                    key={label}
                    className="max-w-[18rem] truncate border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className=" border border-border bg-card px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Runs on your device. Only the vector, filters, and a compared
              title name are sent. Press {"⌘"}/Ctrl + Enter to search.
            </p>
          </form>
        ) : (
          <div className="mt-5 border border-border bg-muted/40 p-4">
            <h2 className="text-sm font-semibold">Turn on semantic search</h2>
            <p className="mt-1 max-w-xl text-xs leading-6 text-muted-foreground">
              Downloads once, about{" "}
              {Math.round(EMBEDDING_DOWNLOAD_BYTES / 1_000_000)} MB, and is
              cached by your browser. Your description stays on this device;
              only the vector and the filters you add are sent.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={enable}
              disabled={loading}
            >
              {loading ? "Downloading..." : "Enable semantic search"}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="mt-4 max-w-md" role="status" aria-live="polite">
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
              className="mt-1.5 h-1 w-full overflow-hidden bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full bg-foreground transition-[width] duration-200"
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
        <section ref={resultsRef} className="mt-8 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="eyebrow">Results</p>
            <p className="text-[11px] text-muted-foreground">
              {result.titles.length} titles
            </p>
          </div>

          {result.reference ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anchored to{" "}
              <Link
                to={"/title/" + encodeURIComponent(result.reference.id)}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground"
              >
                {result.reference.name}
              </Link>
              .
            </p>
          ) : null}

          {result.titles.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
              {result.titles.map((title) => (
                <TitleCard
                  key={title.id}
                  title={title}
                  offers={result.offers[title.id] ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-3 border border-dashed border-border p-6">
              <p className="text-sm text-muted-foreground">
                {applied?.minRating
                  ? `No matches at IMDb ${applied.minRating}+. Try a lower rating or a broader description.`
                  : "No matches. Try a broader description."}{" "}
                <Link
                  to="/"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Browse the catalogue
                </Link>
              </p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
