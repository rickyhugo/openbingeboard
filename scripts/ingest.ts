import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PROVIDER_IDS = [8, 76, 119];
const MONETIZATIONS = ["flatrate", "rent", "buy", "ads", "free"] as const;

type Kind = "movie" | "series";
type Monetization = (typeof MONETIZATIONS)[number];

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

interface TmdbWatch {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  ads?: TmdbProvider[];
  free?: TmdbProvider[];
}

interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genres?: { id: number; name: string }[];
  external_ids?: { imdb_id?: string | null };
  "watch/providers"?: { results?: Record<string, TmdbWatch> };
}

interface DiscoverPage {
  page: number;
  total_pages: number;
  results: { id: number }[];
}

interface OmdbResponse {
  Response: "True" | "False";
  imdbRating?: string;
  imdbVotes?: string;
  Ratings?: { Source: string; Value: string }[];
}

const args = new Map(
  process.argv
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, value = "true"] = arg.replace(/^--/, "").split("=");
      return [key, value] as const;
    }),
);

const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_READ_TOKEN;
const omdbKey = process.env.OMDB_API_KEY;
const region = args.get("region") ?? process.env.REGION ?? "SE";
const providers = (args.get("providers") ?? PROVIDER_IDS.join(","))
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id > 0);
const pages = Number(args.get("pages") ?? 2);
const limit = Number(args.get("limit") ?? 60);
const kinds = (args.get("kinds") ?? "movie,series")
  .split(",")
  .filter((kind): kind is Kind => kind === "movie" || kind === "series");
const out = args.get("out") ?? "db/generated/ingest.sql";
const dryRun = args.get("dry-run") === "true";

if (!apiKey) {
  console.error("Set TMDB_API_KEY or TMDB_READ_TOKEN.");
  process.exit(1);
}

const tmdbKey: string = apiKey;

const sqlString = (value: string | null | undefined) =>
  value === null || value === undefined
    ? "NULL"
    : `'${value.replace(/'/g, "''")}'`;

const sqlNumber = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "NULL"
    : String(value);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tmdb<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  if (!tmdbKey.includes(".")) {
    url.searchParams.set("api_key", tmdbKey);
  }

  const response = await fetch(url, {
    headers: tmdbKey.includes(".")
      ? { Authorization: `Bearer ${tmdbKey}` }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`TMDB ${response.status} ${response.statusText} ${url}`);
  }

  return (await response.json()) as T;
}

async function omdb(imdbId: string): Promise<OmdbResponse | null> {
  if (!omdbKey) return null;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", omdbKey);
  url.searchParams.set("i", imdbId);

  const response = await fetch(url);
  if (!response.ok) return null;

  const body = (await response.json()) as OmdbResponse;
  return body.Response === "True" ? body : null;
}

const yearOf = (detail: TmdbDetail, kind: Kind): number | null => {
  const date = kind === "movie" ? detail.release_date : detail.first_air_date;
  const year = Number.parseInt(date?.slice(0, 4) ?? "", 10);
  return Number.isInteger(year) ? year : null;
};

async function discover(kind: Kind, providerId: number, page: number) {
  return tmdb<DiscoverPage>(`/discover/${kind}`, {
    language: "sv-SE",
    watch_region: region,
    with_watch_providers: providerId,
    with_watch_monetization_types: "flatrate|rent|buy",
    sort_by: "popularity.desc",
    "vote_count.gte": 10,
    include_adult: "false",
    page,
  });
}

async function main() {
  const startedAt = Math.floor(Date.now() / 1000);
  const found = new Map<string, { kind: Kind; id: number }>();

  for (const providerId of providers) {
    for (const kind of kinds) {
      for (let page = 1; page <= pages; page += 1) {
        const result = await discover(kind, providerId, page);
        for (const item of result.results) {
          found.set(`${kind}:${item.id}`, { kind, id: item.id });
        }

        console.error(
          `discover ${kind} provider=${providerId} page=${page}/${Math.min(
            pages,
            result.total_pages,
          )} +${result.results.length}`,
        );

        if (page >= result.total_pages) break;
        await sleep(50);
      }
    }
  }

  const items = [...found.values()].slice(0, limit);
  const statements: string[] = [];
  let offers = 0;
  let failures = 0;

  for (const [index, item] of items.entries()) {
    try {
      const detail = await tmdb<TmdbDetail>(`/${item.kind}/${item.id}`, {
        language: "sv-SE",
        append_to_response: "external_ids,watch/providers",
      });

      const titleId = `tmdb:${item.kind}:${item.id}`;
      const name =
        (item.kind === "movie" ? detail.title : detail.name) ?? "Untitled";
      const originalName =
        (item.kind === "movie"
          ? detail.original_title
          : detail.original_name) ?? null;
      const year = yearOf(detail, item.kind);
      const runtime =
        item.kind === "movie"
          ? (detail.runtime ?? null)
          : (detail.episode_run_time?.[0] ?? null);
      const imdbId = detail.external_ids?.imdb_id ?? null;
      const watch = detail["watch/providers"]?.results?.[region];

      statements.push(
        `INSERT INTO title (id, tmdb_id, kind, imdb_id, name, original_name, year, overview, poster_path, backdrop_path, runtime, tmdb_vote, tmdb_votes, popularity, updated_at) VALUES (` +
          [
            sqlString(titleId),
            sqlNumber(item.id),
            sqlString(item.kind),
            sqlString(imdbId),
            sqlString(name),
            sqlString(originalName),
            sqlNumber(year),
            sqlString(detail.overview ?? null),
            sqlString(detail.poster_path ?? null),
            sqlString(detail.backdrop_path ?? null),
            sqlNumber(runtime),
            sqlNumber(detail.vote_average ?? null),
            sqlNumber(detail.vote_count ?? null),
            sqlNumber(detail.popularity ?? 0),
            sqlNumber(startedAt),
          ].join(", ") +
          `) ON CONFLICT(id) DO UPDATE SET name=excluded.name, original_name=excluded.original_name, year=excluded.year, overview=excluded.overview, poster_path=excluded.poster_path, backdrop_path=excluded.backdrop_path, runtime=excluded.runtime, tmdb_vote=excluded.tmdb_vote, tmdb_votes=excluded.tmdb_votes, popularity=excluded.popularity, imdb_id=excluded.imdb_id, updated_at=excluded.updated_at;`,
      );

      statements.push(
        `DELETE FROM title_genre WHERE title_id = ${sqlString(titleId)};`,
      );
      for (const genre of detail.genres ?? []) {
        statements.push(
          `INSERT INTO genre (id, name) VALUES (${sqlNumber(genre.id)}, ${sqlString(
            genre.name,
          )}) ON CONFLICT(id) DO UPDATE SET name=excluded.name;`,
        );
        statements.push(
          `INSERT OR IGNORE INTO title_genre (title_id, genre_id) VALUES (${sqlString(
            titleId,
          )}, ${sqlNumber(genre.id)});`,
        );
      }

      statements.push(
        `DELETE FROM offer WHERE title_id = ${sqlString(titleId)} AND region = ${sqlString(region)};`,
      );

      for (const monetization of MONETIZATIONS) {
        for (const provider of watch?.[monetization] ?? []) {
          offers += 1;
          statements.push(
            `INSERT INTO provider (id, name, logo_path, display_priority) VALUES (${sqlNumber(
              provider.provider_id,
            )}, ${sqlString(provider.provider_name)}, ${sqlString(
              provider.logo_path,
            )}, ${sqlNumber(provider.display_priority)}) ON CONFLICT(id) DO UPDATE SET name=excluded.name, logo_path=excluded.logo_path, display_priority=excluded.display_priority;`,
          );
          statements.push(
            `INSERT INTO offer (title_id, provider_id, region, monetization, link, updated_at) VALUES (${sqlString(
              titleId,
            )}, ${sqlNumber(provider.provider_id)}, ${sqlString(
              region,
            )}, ${sqlString(monetization)}, ${sqlString(
              watch?.link ?? null,
            )}, ${sqlNumber(startedAt)}) ON CONFLICT(title_id, provider_id, region, monetization) DO UPDATE SET link=excluded.link, updated_at=excluded.updated_at;`,
          );
        }
      }

      if (imdbId) {
        statements.push(
          `DELETE FROM rating WHERE title_id = ${sqlString(titleId)} AND source IN ('imdb', 'rt', 'metacritic');`,
        );

        const scores = await omdb(imdbId);
        const imdbScore = Number.parseFloat(scores?.imdbRating ?? "");
        if (Number.isFinite(imdbScore)) {
          statements.push(
            `INSERT INTO rating (title_id, source, score, scale, votes, url, fetched_at) VALUES (${sqlString(
              titleId,
            )}, 'imdb', ${sqlNumber(imdbScore)}, 10, ${sqlNumber(
              Number.parseInt(
                (scores?.imdbVotes ?? "").replace(/,/g, ""),
                10,
              ) || null,
            )}, ${sqlString(
              `https://www.imdb.com/title/${imdbId}/`,
            )}, ${sqlNumber(startedAt)}) ON CONFLICT(title_id, source) DO UPDATE SET score=excluded.score, votes=excluded.votes, fetched_at=excluded.fetched_at;`,
          );
        }

        for (const rating of scores?.Ratings ?? []) {
          const source =
            rating.Source === "Rotten Tomatoes"
              ? "rt"
              : rating.Source === "Metacritic"
                ? "metacritic"
                : null;
          const score = Number.parseFloat(rating.Value.replace("%", ""));
          if (!source || !Number.isFinite(score)) continue;

          statements.push(
            `INSERT INTO rating (title_id, source, score, scale, votes, url, fetched_at) VALUES (${sqlString(
              titleId,
            )}, ${sqlString(source)}, ${sqlNumber(score)}, 100, NULL, NULL, ${sqlNumber(
              startedAt,
            )}) ON CONFLICT(title_id, source) DO UPDATE SET score=excluded.score, fetched_at=excluded.fetched_at;`,
          );
        }
      }

      statements.push(
        `DELETE FROM title_fts WHERE title_id = ${sqlString(titleId)};`,
      );
      statements.push(
        `INSERT INTO title_fts (title_id, name, original_name, overview) VALUES (${sqlString(
          titleId,
        )}, ${sqlString(name)}, ${sqlString(originalName)}, ${sqlString(
          detail.overview ?? null,
        )});`,
      );

      console.error(
        `title ${index + 1}/${items.length} ${titleId} ${
          watch ? Object.keys(watch).length : 0
        } offer groups`,
      );
      await sleep(40);
    } catch (error) {
      failures += 1;
      console.error(`failed ${item.kind}:${item.id}`, error);
    }
  }

  const finishedAt = Math.floor(Date.now() / 1000);
  statements.push(
    `INSERT INTO ingest_run (region, started_at, finished_at, titles_seen, offers_upserted, status) VALUES (${sqlString(
      region,
    )}, ${sqlNumber(startedAt)}, ${sqlNumber(finishedAt)}, ${sqlNumber(
      items.length,
    )}, ${sqlNumber(offers)}, ${sqlString(failures === 0 ? "ok" : "failed")});`,
  );

  if (dryRun) {
    console.error(
      `dry run: ${items.length} titles, ${offers} offers, ${failures} failures, ${statements.length} statements`,
    );
    return;
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${statements.join("\n")}\n`);
  console.error(
    `wrote ${out}: ${items.length} titles, ${offers} offers, ${failures} failures`,
  );

  if (failures > 0 && items.length === failures) {
    process.exit(1);
  }
}

await main();
