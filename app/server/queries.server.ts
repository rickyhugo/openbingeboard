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
  logoPath: string | null;
}

export interface TitlePage {
  titles: readonly TitleRow[];
  offers: Record<string, OfferRow[]>;
  total: number;
  pageCount: number;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "with",
  "to",
  "watch",
  "film",
  "films",
  "movie",
  "movies",
  "series",
  "show",
  "shows",
  "tv",
  "title",
  "titles",
  "something",
  "like",
]);

const ftsQuery = (input: string) =>
  input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, "")}"*`)
    .join(" ");

export interface ReferenceTitle {
  id: string;
  name: string;
  year: number | null;
  kind: "movie" | "series";
}

// Resolve the title a prompt compares against. An exact name wins; otherwise
// fall back to the full-text index.
export const findTitleByPhrase = (phrase: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const trimmed = phrase.trim();
    if (!trimmed) return null;

    const exact = yield* sql<ReferenceTitle>`
      SELECT id, name, year, kind
      FROM title
      WHERE lower(name) = lower(${trimmed})
         OR lower(original_name) = lower(${trimmed})
      ORDER BY popularity DESC
      LIMIT 1
    `;
    if (exact.length > 0) return exact[0];

    const searchable = trimmed.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
    const fts = ftsQuery(searchable);
    if (!fts) return null;

    const matches = yield* sql<ReferenceTitle>`
      SELECT t.id, t.name, t.year, t.kind
      FROM title_fts
      JOIN title t ON t.id = title_fts.title_id
      WHERE title_fts MATCH ${fts}
      ORDER BY bm25(title_fts)
      LIMIT 1
    `;

    return matches[0] ?? null;
  });

export const listTitles = (region: string, filters: Filters) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const conditions = [
      sql`EXISTS (
        SELECT 1 FROM offer o
        WHERE o.title_id = t.id
          AND o.region = ${region}
          ${filters.providers.length > 0 ? sql`AND o.provider_id IN ${sql.in(filters.providers)}` : sql``}
          ${filters.monetization !== "all" ? sql`AND o.monetization = ${filters.monetization}` : sql``}
      )`,
    ];

    if (filters.q) {
      // A query token that names a genre filters by that genre instead of
      // flooding the text index with it ("action", "comedy", ...).
      const tokens = filters.q.trim().split(/\s+/).filter(Boolean);
      const lowered = tokens.map((token) => token.toLowerCase());
      const genres = yield* sql<{ id: number; name: string }>`
        SELECT id, name FROM genre
      `;
      const matched = genres.filter((genre) =>
        lowered.includes(genre.name.toLowerCase()),
      );

      if (matched.length > 0) {
        conditions.push(
          sql`t.id IN (
            SELECT title_id FROM title_genre
            WHERE genre_id IN ${sql.in(matched.map((genre) => genre.id))}
          )`,
        );
      }

      const noise = new Set([
        ...matched.map((genre) => genre.name.toLowerCase()),
        ...STOP_WORDS,
      ]);
      const searchTokens = lowered.filter((token) => !noise.has(token));

      if (searchTokens.length > 0) {
        conditions.push(
          sql`t.id IN (
            SELECT title_id FROM title_fts
            WHERE title_fts MATCH ${ftsQuery(searchTokens.join(" "))}
          )`,
        );
      }
    }

    if (filters.kind !== "all") {
      conditions.push(sql`t.kind = ${filters.kind}`);
    }

    if (filters.genre !== null) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM title_genre tg
          WHERE tg.title_id = t.id AND tg.genre_id = ${filters.genre}
        )`,
      );
    }

    if (filters.decade !== null) {
      conditions.push(
        sql`t.year >= ${filters.decade} AND t.year < ${filters.decade + 10}`,
      );
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

export const listProviders = (region: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    return yield* sql<ProviderRow>`
      SELECT p.id, p.name, p.logo_path AS "logoPath"
      FROM provider p
      WHERE EXISTS (
        SELECT 1 FROM offer o
        WHERE o.provider_id = p.id
          AND o.region = ${region}
      )
      ORDER BY p.name COLLATE NOCASE
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
