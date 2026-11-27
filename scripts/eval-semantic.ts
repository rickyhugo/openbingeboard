import assert from "node:assert/strict";
import { env, pipeline } from "@huggingface/transformers";
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
  MODEL_ORIGIN,
  queryEmbeddingText,
} from "../app/lib/ai/embedding";
import { parseQueryConstraints } from "../app/lib/ai/query";

interface ResultTitle {
  id: string;
  name: string;
  year: number | null;
  kind: "movie" | "series";
  imdbScore: number | null;
}

interface Reference {
  id: string;
  name: string;
  year: number | null;
  kind: "movie" | "series";
}

interface SearchResponse {
  titles: ResultTitle[];
  reference: Reference | null;
}

interface Case {
  query: string;
  expect?: RegExp;
  kind?: "movie" | "series";
  check?: (result: SearchResponse) => void;
  note?: string;
}

const CASES: Case[] = [
  {
    query: "similar to breaking bad but female main character, +7 IMDb",
    note: "anchor + rating",
    check: ({ titles, reference }) => {
      assert.ok(reference, "Expected the reference title to resolve");
      assert.equal(reference.name, "Breaking Bad");
      assert.ok(titles.length > 0, "Expected results");
      for (const title of titles) {
        assert.ok(
          (title.imdbScore ?? 0) >= 7,
          title.name + " is below the IMDb 7+ constraint",
        );
      }
      assert.ok(
        !titles.some((title) => title.id === reference.id),
        "The reference title should not be in its own similar list",
      );
    },
  },
  {
    query: "a quiet science fiction film, imdb 8+",
    check: ({ titles }) => {
      assert.ok(titles.length > 0, "Expected results");
      for (const title of titles) {
        assert.ok(
          (title.imdbScore ?? 0) >= 8,
          title.name + " is below the IMDb 8+ constraint",
        );
        assert.equal(title.kind, "movie");
      }
    },
  },
  {
    query: "a short crime series from the 90s",
    check: ({ titles }) => {
      assert.ok(titles.length > 0, "Expected results");
      for (const title of titles) {
        assert.equal(title.kind, "series");
        assert.ok(
          title.year !== null && title.year >= 1990 && title.year < 2000,
          title.name + " is outside the 1990s",
        );
      }
    },
  },
  { query: "The Matrix", expect: /matrix/i },
  { query: "a dream heist inside someone's mind", expect: /inception/i },
  {
    query: "a doomed romance on a sinking ocean liner",
    expect: /titanic/i,
  },
  {
    query: "a prison story about hope and friendship",
    expect: /shawshank/i,
  },
  { query: "a mob boss in New Jersey", expect: /sopranos/i, kind: "series" },
  {
    query: "kids in a small town meet a monster from another dimension",
    expect: /stranger things/i,
    kind: "series",
  },
  {
    query: "a chemistry teacher becomes a drug kingpin",
    expect: /breaking bad/i,
    kind: "series",
  },
  { query: "a dark knight faces the joker", expect: /dark knight/i },
  {
    query: "a fantasy quest to destroy a ring",
    expect: /lord of the rings/i,
  },
  {
    query: "a workplace comedy in an office",
    expect: /the office/i,
    kind: "series",
  },
  {
    query: "a desert planet, giant worms, a chosen heir",
    expect: /dune/i,
  },
];

// The parser is the part that must be right before any network call.
const anchored = parseQueryConstraints(
  "similar to breaking bad but female main character, +7 IMDb",
);
assert.equal(anchored.reference, "breaking bad");
assert.equal(anchored.minRating, 7);
assert.ok(!anchored.text.includes("7 IMDb"));
assert.equal(anchored.kind, undefined);

const crime = parseQueryConstraints("a short crime series from the 90s");
assert.equal(crime.kind, "series");
assert.equal(crime.decade, 1990);

const film = parseQueryConstraints("a quiet science fiction film, imdb 8+");
assert.equal(film.kind, "movie");
assert.equal(film.minRating, 8);

assert.equal(parseQueryConstraints("at least 8 on IMDb").minRating, 8);
assert.equal(parseQueryConstraints("IMDb 8 or higher").minRating, 8);
assert.equal(parseQueryConstraints("minimum 7.5 IMDb").minRating, 7.5);
assert.equal(
  parseQueryConstraints("shows like The Wire").reference,
  "The Wire",
);
assert.equal(
  parseQueryConstraints("a show like The Office").reference,
  "The Office",
);
assert.equal(parseQueryConstraints("I like The Wire").reference, null);

const base = process.env.OPENBINGEBOARD_URL ?? "https://openbingeboard.com";

env.cacheDir = "db/generated/model-cache";
env.allowLocalModels = false;
env.remoteHost = MODEL_ORIGIN;
env.remotePathTemplate = "{model}/resolve/" + EMBEDDING_MODEL.revision + "/";

const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL.id, {
  dtype: EMBEDDING_MODEL.dtype,
  device: "cpu",
});

let hits = 0;
const misses: string[] = [];

for (const testCase of CASES) {
  const constraints = parseQueryConstraints(testCase.query);
  const output = await extractor(queryEmbeddingText(constraints.text), {
    pooling: "mean",
    normalize: true,
  });

  const response = await fetch(base + "/api/search/semantic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vector: Array.from(output.data as Float32Array),
      model: EMBEDDING_MODEL_KEY,
      dim: EMBEDDING_MODEL.dim,
      kind: testCase.kind ?? constraints.kind,
      minRating: constraints.minRating,
      decade: constraints.decade,
      reference: constraints.reference,
      services: [],
    }),
  });

  if (!response.ok) {
    console.log("FAIL  " + testCase.query + " (HTTP " + response.status + ")");
    misses.push(testCase.query);
    continue;
  }

  const body = (await response.json()) as SearchResponse;
  const names = body.titles.map(
    (title) => title.name + (title.year ? " (" + title.year + ")" : ""),
  );
  const anchor = body.reference ? " | anchor: " + body.reference.name : "";
  let ok = false;

  if (testCase.check) {
    try {
      testCase.check(body);
      ok = true;
    } catch (cause) {
      console.log(
        "FAIL  " +
          testCase.query +
          " -> " +
          (cause instanceof Error ? cause.message : String(cause)),
      );
    }
    console.log(
      (ok ? "ok    " : "miss  ") +
        testCase.query +
        anchor +
        " | " +
        names.slice(0, 5).join("; "),
    );
  } else if (testCase.expect) {
    const rank = names.findIndex((name) => testCase.expect!.test(name));
    ok = rank >= 0 && rank < 5;
    console.log(
      (ok ? "ok    " : "miss  ") +
        testCase.query +
        " -> " +
        (rank >= 0 ? "rank " + (rank + 1) : "absent") +
        anchor +
        " | " +
        names.slice(0, 3).join("; "),
    );
  }

  if (ok) hits += 1;
  else misses.push(testCase.query);
}

console.log("\n" + hits + "/" + CASES.length + " semantic checks passed");
if (misses.length > 0) {
  console.log("misses: " + misses.join(" | "));
  if (process.argv.includes("--strict")) process.exitCode = 1;
}
