import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { EMBEDDING_MODEL } from "~/lib/ai/embedding";
import { getTitlesWithOffers } from "~/server/extras.server";

interface VectorRow {
  id: string;
  vector: string;
}

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

function dot(a: Float32Array, b: Float32Array): number {
  let score = 0;
  for (let index = 0; index < a.length; index += 1) {
    score += a[index] * b[index];
  }
  return score;
}

export const searchSemanticTitles = (
  region: string,
  services: readonly number[],
  queryVector: readonly number[],
  limit = 48,
) =>
  Effect.gen(function* () {
    const query = normalize(queryVector);
    if (!query) return { titles: [], offers: {} };

    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<VectorRow>`
      SELECT t.id, e.vector
      FROM title t
      JOIN title_embedding e ON e.title_id = t.id
      WHERE e.model = ${EMBEDDING_MODEL.id}
        AND e.dim = ${EMBEDDING_MODEL.dim}
        AND EXISTS (
          SELECT 1 FROM offer o
          WHERE o.title_id = t.id
            AND o.region = ${region}
            ${
              services.length > 0
                ? sql`AND o.provider_id IN ${sql.in(services)}`
                : sql``
            }
        )
    `;

    if (rows.length === 0) return { titles: [], offers: {} };

    const matches = rows
      .map((row) => {
        try {
          return { id: row.id, score: dot(query, decodeVector(row.vector)) };
        } catch {
          return null;
        }
      })
      .filter((match): match is { id: string; score: number } => match !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (matches.length === 0) return { titles: [], offers: {} };

    const ids = matches.map((match) => match.id);
    const result = yield* getTitlesWithOffers(region, ids);
    const order = new Map(ids.map((id, index) => [id, index]));
    const titles = [...result.titles].sort(
      (a, b) =>
        (order.get(a.id) ?? ids.length) - (order.get(b.id) ?? ids.length),
    );

    return { titles, offers: result.offers };
  });
