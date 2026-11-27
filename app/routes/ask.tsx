import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { TitleCard } from "~/components/title-card";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { EMBEDDING_MODEL } from "~/lib/ai/embedding";
import { embedQuery } from "~/lib/ai/embedding-client";
import type { OfferRow, TitleRow } from "~/server/queries.server";

interface SearchResult {
  titles: TitleRow[];
  offers: Record<string, OfferRow[]>;
}

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
  const [query, setQuery] = useState("");
  const [allServices, setAllServices] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

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
    setStatus(
      "Preparing the local model. The first run downloads about 34 MB.",
    );

    try {
      const vector = await embedQuery(text);
      setStatus("Searching the catalogue...");

      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          model: EMBEDDING_MODEL.id,
          dim: EMBEDDING_MODEL.dim,
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

      <form onSubmit={submit} className="mt-6 max-w-3xl">
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. a tense Scandinavian crime series, or something like Arrival but lighter"
          aria-label="Describe what you want to watch"
          maxLength={300}
          rows={3}
          className="w-full resize-none border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Searching..." : "Search"}
          </Button>
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
        The first search downloads about 60 MB of model and runtime files. They
        are cached in your browser. Your description stays on this device; only
        the vector is sent.
      </p>

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
