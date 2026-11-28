import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { EMBEDDING_MODEL, EMBEDDING_MODEL_KEY } from "~/lib/ai/embedding";
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { getTitlesWithOffers } from "~/server/extras.server";
import {
  findTitleByPhrase,
  type ReferenceTitle,
} from "~/server/queries.server";

const VECTOR_CACHE_TTL = 10 * 60 * 1000;
// The reference is a gate, not a blend: keep the closest titles, then let the
// full prompt order them.
const REFERENCE_POOL = 20;

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

interface SemanticOptions {
  kind?: "movie" | "series";
  limit?: number;
  minRating?: number;
  decade?: number;
  genre?: number;
  monetization?: "flatrate" | "rent" | "buy" | "ads" | "free";
  reference?: string | null;
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
  return normalizeInPlace(normalized) ? normalized : null;
}

function normalizeInPlace(vector: Float32Array): boolean {
  let norm = 0;
  for (const value of vector) {
    if (!Number.isFinite(value)) return false;
    norm += value * value;
  }
  if (norm === 0) return false;

  const scale = 1 / Math.sqrt(norm);
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] *= scale;
  }
  return true;
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

function dotBetween(data: Float32Array, left: number, right: number): number {
  let score = 0;
  for (let index = 0; index < EMBEDDING_MODEL.dim; index += 1) {
    score += data[left + index] * data[right + index];
  }
  return score;
}

const empty = { titles: [], offers: {}, reference: null };

export const searchSemanticTitles = (
  region: string,
  services: readonly number[],
  queryVector: readonly number[],
  options: SemanticOptions = {},
) =>
  Effect.gen(function* () {
    const query = normalize(queryVector);
    if (!query) return empty;

    const set = yield* Effect.promise(() =>
      cached<VectorSet>(
        "semantic-vectors:v1:" + EMBEDDING_MODEL_KEY,
        VECTOR_CACHE_TTL,
        () => runQuery(listVectors()),
      ),
    );
    if (set.ids.length === 0) return empty;

    const data = decodeSet(set);
    if (!data) return empty;

    // "Similar to Breaking Bad" first narrows the candidate pool to titles
    // close to that reference, then the full prompt orders the pool.
    let reference: ReferenceTitle | null = null;
    let referenceOffset: number | null = null;
    if (options.reference) {
      const resolved = yield* findTitleByPhrase(options.reference);
      const position = resolved ? set.ids.indexOf(resolved.id) : -1;
      if (resolved && position >= 0) {
        reference = resolved;
        referenceOffset = position * EMBEDDING_MODEL.dim;
      }
    }

    const sql = yield* SqlClient.SqlClient;
    const minRating = options.minRating ?? 0;
    const eligible = yield* sql<IdRow>`
      SELECT DISTINCT o.title_id AS id
      FROM offer o
      JOIN title t ON t.id = o.title_id
      WHERE o.region = ${region}
        ${options.kind ? sql`AND t.kind = ${options.kind}` : sql``}
        ${
          options.decade !== undefined
            ? sql`AND t.year >= ${options.decade} AND t.year < ${options.decade + 10}`
            : sql``
        }
        ${
          options.genre !== undefined
            ? sql`AND t.id IN (
                SELECT title_id FROM title_genre WHERE genre_id = ${options.genre}
              )`
            : sql``
        }
        ${
          options.monetization
            ? sql`AND o.monetization = ${options.monetization}`
            : sql``
        }
        ${
          minRating > 0
            ? sql`AND EXISTS (
                SELECT 1 FROM rating r
                WHERE r.title_id = t.id
                  AND r.source = 'imdb'
                  AND r.score >= ${minRating}
              )`
            : sql``
        }
        ${
          services.length > 0
            ? sql`AND o.provider_id IN ${sql.in(services)}`
            : sql``
        }
    `;

    const positions = new Map(set.ids.map((id, index) => [id, index]));
    const matches: { id: string; score: number; anchorScore: number }[] = [];

    for (const row of eligible) {
      if (reference && row.id === reference.id) continue;
      const position = positions.get(row.id);
      if (position === undefined) continue;
      const offset = position * EMBEDDING_MODEL.dim;
      matches.push({
        id: row.id,
        score: dotAt(query, data, offset),
        anchorScore:
          referenceOffset === null
            ? 0
            : dotBetween(data, referenceOffset, offset),
      });
    }

    if (matches.length === 0) {
      return { titles: [], offers: {}, reference };
    }

    const pool =
      referenceOffset === null
        ? matches
        : matches
            .sort((a, b) => b.anchorScore - a.anchorScore)
            .slice(0, REFERENCE_POOL);
    const ranked = pool
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 18);
    const ids = ranked.map((match) => match.id);
    const result = yield* getTitlesWithOffers(region, ids);
    const order = new Map(ids.map((id, index) => [id, index]));
    const titles = [...result.titles].sort(
      (a, b) =>
        (order.get(a.id) ?? ids.length) - (order.get(b.id) ?? ids.length),
    );

    return { titles, offers: result.offers, reference };
  });
