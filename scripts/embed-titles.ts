import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
  MODEL_ORIGIN,
  documentEmbeddingText,
} from "../app/lib/ai/embedding";

interface TitleRecord {
  id: string;
  name: string;
  originalName: string | null;
  year: number | null;
  kind: "movie" | "series";
  overview: string | null;
  genres: string | null;
}

const args = new Map<string, string>();
for (const raw of process.argv.slice(2)) {
  if (raw === "--" || !raw.startsWith("--")) continue;
  const [name, value = "true"] = raw.replace(/^--/, "").split("=");
  args.set(name, value);
}

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const database =
  process.env.D1_DATABASE_ID ?? "be5efb5b-b4fd-4409-a38f-4def80adc89a";
const out = args.get("out") ?? "db/generated/title-embeddings.sql";
const full = args.has("full");
const maxTitles = args.has("limit")
  ? Number.parseInt(args.get("limit") ?? "", 10)
  : Number.POSITIVE_INFINITY;

if (!account || !token) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.");
  process.exit(1);
}

// Cache the pinned revision separately so a different revision in the bucket
// can never be served from an older local cache.
env.cacheDir = "db/generated/model-cache";
env.allowLocalModels = false;
env.remoteHost = MODEL_ORIGIN;
env.remotePathTemplate = "{model}/resolve/" + EMBEDDING_MODEL.revision + "/";

async function query<T>(sql: string): Promise<T[]> {
  const response = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" +
      account +
      "/d1/database/" +
      database +
      "/query",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    },
  );

  const body = (await response.json()) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: { results?: T[] }[];
  };

  if (!response.ok || !body.success) {
    throw new Error(
      body.errors?.[0]?.message ?? "D1 query failed with " + response.status,
    );
  }

  return body.result?.[0]?.results ?? [];
}

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return "'" + value.replace(/'/g, "''") + "'";
}

function encodeVector(vector: number[]): string {
  const floats = Float32Array.from(vector);
  return Buffer.from(
    new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength),
  ).toString("base64");
}

function contentHash(text: string): string {
  return createHash("sha256")
    .update(EMBEDDING_MODEL_KEY)
    .update("\n")
    .update(text)
    .digest("hex");
}

async function loadTitles(): Promise<TitleRecord[]> {
  const rows: TitleRecord[] = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const page = await query<TitleRecord>(
      "SELECT t.id, t.name, t.original_name AS originalName, t.year, " +
        "t.kind, t.overview, " +
        "(SELECT GROUP_CONCAT(g.name, ', ') FROM title_genre tg " +
        "JOIN genre g ON g.id = tg.genre_id WHERE tg.title_id = t.id) AS genres " +
        "FROM title t ORDER BY t.id LIMIT " +
        pageSize +
        " OFFSET " +
        offset,
    );
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function loadHashes(): Promise<Map<string, string | null>> {
  const rows = await query<{ id: string; hash: string | null }>(
    "SELECT title_id AS id, content_hash AS hash FROM title_embedding " +
      "WHERE model = " +
      sqlString(EMBEDDING_MODEL_KEY) +
      " AND dim = " +
      EMBEDDING_MODEL.dim,
  );
  return new Map(rows.map((row) => [row.id, row.hash]));
}

async function main() {
  const titles = (await loadTitles()).slice(0, maxTitles);
  if (titles.length === 0) return;

  const existing = full ? new Map<string, string | null>() : await loadHashes();
  const pending = titles
    .map((title) => {
      const text = documentEmbeddingText({
        name: title.name,
        originalName: title.originalName,
        year: title.year,
        kind: title.kind,
        genres: title.genres ? title.genres.split(", ") : [],
        overview: title.overview,
      });
      return { title, text, hash: contentHash(text) };
    })
    .filter((item) => item.hash !== existing.get(item.title.id));

  const skipped = titles.length - pending.length;
  console.log(
    "titles " +
      titles.length +
      ", to embed " +
      pending.length +
      ", unchanged " +
      skipped,
  );
  if (pending.length === 0) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, "");
    return;
  }

  console.log("loading " + EMBEDDING_MODEL.id + "@" + EMBEDDING_MODEL.revision);
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL.id, {
    dtype: EMBEDDING_MODEL.dtype,
    device: "cpu",
  });

  const statements: string[] = [];
  const batchSize = 24;

  for (let index = 0; index < pending.length; index += batchSize) {
    const batch = pending.slice(index, index + batchSize);
    const output = await extractor(
      batch.map((item) => item.text),
      { pooling: "mean", normalize: true },
    );
    const vectors = output.tolist() as number[][];

    batch.forEach((item, vectorIndex) => {
      statements.push(
        "INSERT INTO title_embedding " +
          "(title_id, model, dim, vector, content_hash, updated_at) VALUES (" +
          sqlString(item.title.id) +
          ", " +
          sqlString(EMBEDDING_MODEL_KEY) +
          ", " +
          EMBEDDING_MODEL.dim +
          ", " +
          sqlString(encodeVector(vectors[vectorIndex])) +
          ", " +
          sqlString(item.hash) +
          ", " +
          Date.now() +
          ") ON CONFLICT(title_id) DO UPDATE SET " +
          "model=excluded.model, dim=excluded.dim, vector=excluded.vector, " +
          "content_hash=excluded.content_hash, updated_at=excluded.updated_at;",
      );
    });

    console.log(
      "embedded " +
        Math.min(index + batch.length, pending.length) +
        "/" +
        pending.length,
    );
  }

  if (!args.has("limit")) {
    statements.push(
      "DELETE FROM title_embedding WHERE model <> " +
        sqlString(EMBEDDING_MODEL_KEY) +
        ";",
    );
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, statements.join("\n") + "\n");
  console.log("wrote " + out + " (" + statements.length + " statements)");
}

await main();
