import { env, pipeline } from "@huggingface/transformers";
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
  MODEL_ORIGIN,
  queryEmbeddingText,
} from "../app/lib/ai/embedding";

interface Case {
  query: string;
  expect: RegExp;
  kind?: "movie" | "series";
}

const CASES: Case[] = [
  { query: "The Matrix", expect: /matrix/i },
  { query: "a dream heist inside someone's mind", expect: /inception/i },
  { query: "a doomed romance on a sinking ocean liner", expect: /titanic/i },
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
  { query: "a desert planet, giant worms, a chosen heir", expect: /dune/i },
];

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
  const output = await extractor(queryEmbeddingText(testCase.query), {
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
      kind: testCase.kind,
      services: [],
    }),
  });

  if (!response.ok) {
    console.log("FAIL  " + testCase.query + " (HTTP " + response.status + ")");
    misses.push(testCase.query);
    continue;
  }

  const body = (await response.json()) as {
    titles: { name: string; year: number | null }[];
  };
  const names = body.titles.map(
    (title) => title.name + (title.year ? " (" + title.year + ")" : ""),
  );
  const rank = names.findIndex((name) => testCase.expect.test(name));
  const ok = rank >= 0 && rank < 5;

  if (ok) hits += 1;
  else misses.push(testCase.query);

  console.log(
    (ok ? "ok    " : "miss  ") +
      testCase.query +
      " -> " +
      (rank >= 0 ? "rank " + (rank + 1) : "absent") +
      " | " +
      names.slice(0, 3).join("; "),
  );
}

console.log("\n" + hits + "/" + CASES.length + " expected titles in the top 5");
if (misses.length > 0) {
  console.log("misses: " + misses.join(" | "));
  if (process.argv.includes("--strict")) process.exitCode = 1;
}
