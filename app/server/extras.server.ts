import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { TitleRow } from "~/server/queries.server";

export interface GenreRow {
  id: number;
  name: string;
}

export interface ImdbStats {
  total: number;
  percentile: number;
  histogram: readonly { bucket: number; count: number }[];
}

export const listGenres = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  return yield* sql.unsafe<GenreRow>(
    "SELECT id, name FROM genre ORDER BY name",
  );
});

export const getTitlesByIds = (ids: readonly string[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const query =
      "SELECT t.id, t.kind, t.name, t.year, t.poster_path AS posterPath, " +
      "t.popularity, t.tmdb_vote AS tmdbVote, imdb.score AS imdbScore, " +
      "rt.score AS rtScore " +
      "FROM title t " +
      "LEFT JOIN rating imdb ON imdb.title_id = t.id AND imdb.source = 'imdb' " +
      "LEFT JOIN rating rt ON rt.title_id = t.id AND rt.source = 'rt' " +
      "WHERE t.id IN (" +
      placeholders +
      ") ORDER BY t.name COLLATE NOCASE";

    return yield* sql.unsafe<TitleRow>(query, [...ids]);
  });

export const getImdbStats = (score: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const histogram = yield* sql.unsafe<{ bucket: number; count: number }>(
      "SELECT CAST(score AS INTEGER) AS bucket, COUNT(*) AS count " +
        "FROM rating WHERE source = 'imdb' GROUP BY bucket ORDER BY bucket",
    );
    const totals = yield* sql.unsafe<{ total: number }>(
      "SELECT COUNT(*) AS total FROM rating WHERE source = 'imdb'",
    );
    const below = yield* sql.unsafe<{ below: number }>(
      "SELECT COUNT(*) AS below FROM rating WHERE source = 'imdb' AND score < ?",
      [score],
    );

    const total = Number(totals[0]?.total ?? 0);
    const lower = Number(below[0]?.below ?? 0);

    return {
      total,
      percentile: total > 0 ? Math.round((lower / total) * 100) : 0,
      histogram,
    } satisfies ImdbStats;
  });
