import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { EMBEDDING_MODEL, EMBEDDING_MODEL_KEY } from "~/lib/ai/embedding";
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { getTitlesWithOffers } from "~/server/extras.server";

const VECTOR_CACHE_TTL = 10 * 60 * 1000;

interface VectorRow {
  id: string;
  vector: string;
}

interface VectorSet {
  ids: string[];
  vectors: string[];
}

interface IdRow {
  id: string;
}

const listVectors = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<VectorRow>`
      SELECT title_id AS id, vector
      FROM title_embedding
      WHERE model = ${EMBEDDING_MODEL_KEY}
        AND dim = ${EMBEDDING_MODEL.dim}
      ORDER BY title_id
    `;

    return {
      ids: rows.map((row) => row.id),
      vectors: rows.map((row) => row.vector),
    } satisfies VectorSet;
  });

function decodeVector(value: string): Float32Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Float32Array(bytes.buffer);
}

function normalize(vector: readonly number[]): Float32Array | null {
  if (vector.length !== EMBEDDING_MODEL.dim) return null;
  const normalized = new Float32Array(vector);
  let norm = 0;
  for (const value of normalized) {
    if (!Number.isFinite(value)) return null;
    norm += value * value;
  }
  if (norm === 0) return null;
  const scale = 1 / Math.sqrt(norm);
  for (let index = 0; index < normalized.length; index += 1) {
    normalized[index] *= scale;
  }
  return normalized;
}

// The cached set holds ~2 MB of base64 vectors. Decode it once per isolate
// instead of on every search.
const decodedSets = new WeakMap<VectorSet, Float32Array | null>();

function decodeSet(set: VectorSet): Float32Array | null {
  const memo = decodedSets.get(set);
  if (memo !== undefined) return memo;

  const dim = EMBEDDING_MODEL.dim;
  const data = new Float32Array(set.ids.length * dim);

  for (let index = 0; index < set.ids.length; index += 1) {
    const vector = decodeVector(set.vectors[index]);
    if (vector.length !== dim) {
      decodedSets.set(set, null);
      return null;
    }
    data.set(vector, index * dim);
  }

  decodedSets.set(set, data);
  return data;
}

function dotAt(
  query: Float32Array,
  data: Float32Array,
  offset: number,
): number {
  let score = 0;
  for (let index = 0; index < query.length; index += 1) {
    score += query[index] * data[offset + index];
  }
  return score;
}

export const searchSemanticTitles = (
  region: string,
  services: readonly number[],
  queryVector: readonly number[],
  options: { kind?: "movie" | "series"; limit?: number } = {},
) =>
  Effect.gen(function* () {
    const query = normalize(queryVector);
    if (!query) return { titles: [], offers: {} };

    const set = yield* Effect.promise(() =>
      cached<VectorSet>(
        "semantic-vectors:v1:" + EMBEDDING_MODEL_KEY,
        VECTOR_CACHE_TTL,
        () => runQuery(listVectors()),
      ),
    );
    if (set.ids.length === 0) return { titles: [], offers: {} };

    const data = decodeSet(set);
    if (!data) return { titles: [], offers: {} };

    const sql = yield* SqlClient.SqlClient;
    const eligible = yield* sql<IdRow>`
      SELECT DISTINCT o.title_id AS id
      FROM offer o
      JOIN title t ON t.id = o.title_id
      WHERE o.region = ${region}
        ${options.kind ? sql`AND t.kind = ${options.kind}` : sql``}
        ${
          services.length > 0
            ? sql`AND o.provider_id IN ${sql.in(services)}`
            : sql``
        }
    `;

    const positions = new Map(set.ids.map((id, index) => [id, index]));
    const matches: { id: string; score: number }[] = [];

    for (const row of eligible) {
      const position = positions.get(row.id);
      if (position === undefined) continue;
      matches.push({
        id: row.id,
        score: dotAt(query, data, position * EMBEDDING_MODEL.dim),
      });
    }

    if (matches.length === 0) return { titles: [], offers: {} };

    const ranked = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 18);
    const ids = ranked.map((match) => match.id);
    const result = yield* getTitlesWithOffers(region, ids);
    const order = new Map(ids.map((id, index) => [id, index]));
    const titles = [...result.titles].sort(
      (a, b) =>
        (order.get(a.id) ?? ids.length) - (order.get(b.id) ?? ids.length),
    );

    return { titles, offers: result.offers };
  });
