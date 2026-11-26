import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { PAGE_SIZE, type Filters } from "~/lib/filters";

export interface OfferRow {
  titleId: string;
  providerId: number;
  providerName: string;
  monetization: "flatrate" | "rent" | "buy" | "ads" | "free";
  link: string | null;
}

export interface TitleRow {
  id: string;
  kind: "movie" | "series";
  name: string;
  year: number | null;
  posterPath: string | null;
  popularity: number;
  tmdbVote: number | null;
  imdbScore: number | null;
  rtScore: number | null;
}

export interface RatingRow {
  source: "imdb" | "rt" | "metacritic" | "tmdb";
  score: number;
  scale: number;
  votes: number | null;
  url: string | null;
}

export interface TitleDetail extends TitleRow {
  imdbId: string | null;
  originalName: string | null;
  overview: string | null;
  runtime: number | null;
  genres: readonly string[];
  ratings: readonly RatingRow[];
  offers: readonly OfferRow[];
}

export interface ProviderRow {
  id: number;
  name: string;
}

export interface TitlePage {
  titles: readonly TitleRow[];
  offers: Record<string, OfferRow[]>;
  total: number;
  pageCount: number;
}

const ftsQuery = (input: string) =>
  input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, "")}"*`)
    .join(" ");

export const listTitles = (region: string, filters: Filters) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const conditions = [
      sql`EXISTS (
        SELECT 1 FROM offer o
        WHERE o.title_id = t.id
          AND o.region = ${region}
          ${filters.provider ? sql`AND o.provider_id = ${filters.provider}` : sql``}
          ${filters.monetization !== "all" ? sql`AND o.monetization = ${filters.monetization}` : sql``}
      )`,
    ];

    if (filters.q) {
      conditions.push(
        sql`t.id IN (
          SELECT title_id FROM title_fts
          WHERE title_fts MATCH ${ftsQuery(filters.q)}
        )`,
      );
    }

    if (filters.kind !== "all") {
      conditions.push(sql`t.kind = ${filters.kind}`);
    }

    if (filters.minRating > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM rating r
          WHERE r.title_id = t.id
            AND r.source = 'imdb'
            AND r.score >= ${filters.minRating}
        )`,
      );
    }

    const where = sql.and(conditions);
    const offset = (filters.page - 1) * PAGE_SIZE;

    const orderBy =
      filters.sort === "year"
        ? sql`t.year DESC, t.popularity DESC`
        : filters.sort === "popularity"
          ? sql`t.popularity DESC`
          : filters.sort === "title"
            ? sql`t.name COLLATE NOCASE ASC`
            : sql`COALESCE(imdb.score, 0) DESC, t.popularity DESC`;

    const titles = yield* sql<TitleRow>`
      SELECT
        t.id,
        t.kind,
        t.name,
        t.year,
        t.poster_path AS "posterPath",
        t.popularity,
        t.tmdb_vote AS "tmdbVote",
        imdb.score AS "imdbScore",
        rt.score AS "rtScore"
      FROM title t
      LEFT JOIN rating imdb
        ON imdb.title_id = t.id AND imdb.source = 'imdb'
      LEFT JOIN rating rt
        ON rt.title_id = t.id AND rt.source = 'rt'
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `;

    const counted = yield* sql<{ total: number }>`
      SELECT COUNT(*) AS total
      FROM title t
      WHERE ${where}
    `;

    const total = Number(counted[0]?.total ?? 0);
    const offers: Record<string, OfferRow[]> = {};

    if (titles.length > 0) {
      const rows = yield* sql<OfferRow>`
        SELECT
          o.title_id AS "titleId",
          o.provider_id AS "providerId",
          p.name AS "providerName",
          o.monetization,
          o.link
        FROM offer o
        JOIN provider p ON p.id = o.provider_id
        WHERE o.region = ${region}
          AND o.title_id IN ${sql.in(titles.map((title) => title.id))}
        ORDER BY
          CASE o.monetization
            WHEN 'flatrate' THEN 0
            WHEN 'free' THEN 1
            WHEN 'ads' THEN 2
            WHEN 'rent' THEN 3
            ELSE 4
          END,
          p.display_priority
      `;

      for (const row of rows) {
        (offers[row.titleId] ??= []).push(row);
      }
    }

    return {
      titles,
      offers,
      total,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    } satisfies TitlePage;
  });

export const listProviders = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  return yield* sql<ProviderRow>`
    SELECT id, name
    FROM provider
    ORDER BY display_priority, name
  `;
});

export const getTitle = (region: string, id: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const rows = yield* sql<Omit<TitleDetail, "genres" | "ratings" | "offers">>`
      SELECT
        t.id,
        t.kind,
        t.name,
        t.year,
        t.poster_path AS "posterPath",
        t.popularity,
        t.tmdb_vote AS "tmdbVote",
        imdb.score AS "imdbScore",
        rt.score AS "rtScore",
        t.imdb_id AS "imdbId",
        t.original_name AS "originalName",
        t.overview,
        t.runtime
      FROM title t
      LEFT JOIN rating imdb
        ON imdb.title_id = t.id AND imdb.source = 'imdb'
      LEFT JOIN rating rt
        ON rt.title_id = t.id AND rt.source = 'rt'
      WHERE t.id = ${id}
      LIMIT 1
    `;

    const title = rows[0];
    if (!title) return null;

    const ratings = yield* sql<RatingRow>`
      SELECT source, score, scale, votes, url
      FROM rating
      WHERE title_id = ${id}
      ORDER BY
        CASE source
          WHEN 'imdb' THEN 0
          WHEN 'rt' THEN 1
          WHEN 'metacritic' THEN 2
          ELSE 3
        END
    `;

    const genres = yield* sql<{ name: string }>`
      SELECT g.name
      FROM title_genre tg
      JOIN genre g ON g.id = tg.genre_id
      WHERE tg.title_id = ${id}
      ORDER BY g.name
    `;

    const offers = yield* sql<OfferRow>`
      SELECT
        o.title_id AS "titleId",
        o.provider_id AS "providerId",
        p.name AS "providerName",
        o.monetization,
        o.link
      FROM offer o
      JOIN provider p ON p.id = o.provider_id
      WHERE o.region = ${region}
        AND o.title_id = ${id}
      ORDER BY
        CASE o.monetization
          WHEN 'flatrate' THEN 0
          WHEN 'free' THEN 1
          WHEN 'ads' THEN 2
          WHEN 'rent' THEN 3
          ELSE 4
        END,
        p.display_priority
    `;

    return {
      ...title,
      genres: genres.map((genre) => genre.name),
      ratings,
      offers,
    } satisfies TitleDetail;
  });
