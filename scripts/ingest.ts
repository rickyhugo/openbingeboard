import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { dirname } from "node:path";

type Kind = "movie" | "series";
type Monetization = "flatrate" | "rent" | "buy" | "ads" | "free";
type ProviderMode = "default" | "auto" | "explicit";

interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  priority: number;
}

interface Offer {
  provider: Provider;
  monetization: Monetization;
  link: string | null;
}

interface Rating {
  source: "imdb" | "rt" | "metacritic" | "tmdb";
  score: number;
  scale: number;
  votes: number | null;
  url: string | null;
}

interface Title {
  id: string;
  tmdbId: number;
  kind: Kind;
  imdbId: string | null;
  name: string;
  originalName: string | null;
  searchTitle: string;
  year: number | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  runtime: number | null;
  tmdbVote: number | null;
  tmdbVotes: number | null;
  popularity: number;
  genres: { id: number; name: string }[];
  offers: Offer[];
  ratings: Rating[];
}

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

interface TmdbTranslation {
  iso_639_1: string;
  iso_3166_1: string;
  data?: { overview?: string; title?: string; name?: string };
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
  translations?: { translations?: TmdbTranslation[] };
  "watch/providers"?: { results?: Record<string, TmdbWatch> };
}

interface DiscoverItem {
  id: number;
  popularity?: number;
}

interface DiscoverPage {
  page: number;
  total_pages: number;
  results: DiscoverItem[];
}

interface OmdbResponse {
  Response: "True" | "False";
  Error?: string;
  Ratings?: { Source: string; Value: string }[];
}

interface JwOffer {
  monetizationType?: string;
  standardWebURL?: string;
  package?: { packageId?: number };
}

interface JwNode {
  objectType?: string;
  content?: { title?: string; originalReleaseYear?: number };
  offers?: JwOffer[];
}

interface JwResponse {
  data?: {
    popularTitles?: { edges?: { node: JwNode }[] };
  };
}

interface ImdbRating {
  rating: number;
  votes: number;
}

const MONETIZATIONS: Monetization[] = [
  "flatrate",
  "rent",
  "buy",
  "ads",
  "free",
];

const DEFAULT_PROVIDERS = [
  8, 119, 337, 76, 1773, 1899, 1944, 493, 426, 35, 2, 350, 423, 300, 11, 283,
  497,
];

const EXCLUDED_PROVIDERS = new Set([175, 1825, 1968, 2791]);
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMDB_RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const JUSTWATCH_URL = "https://apis.justwatch.com/graphql";
const JUSTWATCH_QUERY =
  "query($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) { popularTitles(country: $country, first: $first, filter: $filter) { edges { node { objectType content(country: $country, language: $language) { title originalReleaseYear } offers(country: $country, platform: WEB) { monetizationType standardWebURL package { packageId } } } } } }";

const args = new Map<string, string>();
for (const raw of process.argv.slice(2)) {
  if (raw === "--" || !raw.startsWith("--")) continue;
  const [name, value = "true"] = raw.replace(/^--/, "").split("=");
  args.set(name, value);
}

function numberArg(name: string, fallback: number): number {
  const raw = args.get(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const region = args.get("region") ?? process.env.REGION ?? "SE";
const language = args.get("language") ?? "sv-SE";
const pages = numberArg("pages", 10);
const limit = numberArg("limit", 5000);
const omdbLimit = numberArg("omdb-limit", 200);
const maxPriority = numberArg("max-priority", 20);
const chunkBytes = numberArg("chunk-bytes", 4_000_000);
const out = args.get("out") ?? "db/generated/ingest";
const dryRun = args.get("dry-run") === "true";
const useImdb = args.get("no-imdb") !== "true";
const useJustWatch = args.get("no-justwatch") !== "true";
const justwatchDelay = numberArg("justwatch-delay", 100);
const imdbCache = args.get("imdb-cache") ?? ".cache/imdb-ratings.tsv.gz";

const providerArg = args.get("providers");
const providerMode: ProviderMode =
  providerArg === undefined
    ? "default"
    : providerArg === "auto"
      ? "auto"
      : "explicit";
const explicitProviders = (
  providerMode === "explicit" && providerArg ? providerArg.split(",") : []
)
  .map(Number)
  .filter((id) => Number.isInteger(id) && id > 0);
const extraExcluded = new Set(
  (args.get("exclude-providers") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0),
);

const tmdbKey = process.env.TMDB_API_KEY ?? process.env.TMDB_READ_TOKEN;
const omdbToken = process.env.OMDB_API_KEY ?? "";

if (!tmdbKey) {
  console.error("Set TMDB_API_KEY or TMDB_READ_TOKEN.");
  process.exit(1);
}

const key: string = tmdbKey;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message: string) => console.error(message);

const sqlString = (value: string | null | undefined) =>
  value === null || value === undefined
    ? "NULL"
    : "'" + value.replace(/'/g, "''") + "'";

const sqlNumber = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "NULL"
    : String(value);

class SqlWriter {
  private buffer: string[] = [];
  private bytes = 0;
  private index = 0;
  private files: string[] = [];
  statements = 0;

  constructor(
    private prefix: string,
    private maxBytes: number,
    private skip: boolean,
  ) {}

  add(statement: string) {
    this.statements += 1;
    if (this.skip) return;
    this.buffer.push(statement);
    this.bytes += statement.length + 1;
    if (this.bytes >= this.maxBytes) this.flush();
  }

  private flush() {
    if (this.buffer.length === 0) return;
    const index = String(this.index + 1).padStart(3, "0");
    const path = this.prefix + ".part-" + index + ".sql";
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, this.buffer.join("\n") + "\n");
    this.files.push(path);
    this.index += 1;
    this.buffer = [];
    this.bytes = 0;
  }

  finish(): string[] {
    this.flush();
    return this.files;
  }
}

async function tmdb<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }
  if (!key.includes(".")) url.searchParams.set("api_key", key);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: key.includes(".")
        ? { Authorization: "Bearer " + key }
        : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (response.ok) return (await response.json()) as T;
    if (response.status === 429 || response.status >= 500) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new Error(
      "TMDB " + response.status + " " + response.statusText + " " + url,
    );
  }

  throw new Error("TMDB retries exhausted " + url);
}

const mediaPath = (kind: Kind) => (kind === "movie" ? "movie" : "tv");

async function loadProviders(): Promise<Provider[]> {
  const [movie, tv] = await Promise.all([
    tmdb<{ results: TmdbProvider[] }>("/watch/providers/movie", {
      watch_region: region,
      language: "en-US",
    }),
    tmdb<{ results: TmdbProvider[] }>("/watch/providers/tv", {
      watch_region: region,
      language: "en-US",
    }),
  ]);

  const merged = new Map<number, Provider>();
  for (const provider of [...movie.results, ...tv.results]) {
    const current = merged.get(provider.provider_id);
    merged.set(provider.provider_id, {
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path,
      priority: Math.min(
        current?.priority ?? provider.display_priority,
        provider.display_priority,
      ),
    });
  }

  return [...merged.values()];
}

async function resolveProviders(): Promise<Provider[]> {
  const all = await loadProviders();
  const isAllowed = (provider: Provider) =>
    !EXCLUDED_PROVIDERS.has(provider.id) && !extraExcluded.has(provider.id);

  if (providerMode === "explicit") {
    return explicitProviders
      .map((id) => all.find((provider) => provider.id === id))
      .filter((provider): provider is Provider => provider !== undefined);
  }

  if (providerMode === "auto") {
    return all
      .filter(
        (provider) => provider.priority <= maxPriority && isAllowed(provider),
      )
      .sort((a, b) => a.priority - b.priority);
  }

  return DEFAULT_PROVIDERS.map((id) =>
    all.find((provider) => provider.id === id),
  ).filter((provider): provider is Provider => provider !== undefined);
}

async function discover(kind: Kind, providerId: number, page: number) {
  return tmdb<DiscoverPage>("/discover/" + mediaPath(kind), {
    language,
    watch_region: region,
    with_watch_providers: providerId,
    with_watch_monetization_types: "flatrate|rent|buy",
    sort_by: "popularity.desc",
    include_adult: "false",
    page,
  });
}

async function titleDetail(kind: Kind, id: number) {
  return tmdb<TmdbDetail>("/" + mediaPath(kind) + "/" + id, {
    language,
    append_to_response: "external_ids,watch/providers,translations",
  });
}

function toTitle(
  kind: Kind,
  detail: TmdbDetail,
  fallbackPopularity: number,
): Title {
  const watch = detail["watch/providers"]?.results?.[region];
  const offers: Offer[] = [];

  for (const monetization of MONETIZATIONS) {
    for (const provider of watch?.[monetization] ?? []) {
      offers.push({
        provider: {
          id: provider.provider_id,
          name: provider.provider_name,
          logoPath: provider.logo_path,
          priority: provider.display_priority,
        },
        monetization,
        link: watch?.link ?? null,
      });
    }
  }

  const releaseDate =
    kind === "movie" ? detail.release_date : detail.first_air_date;
  const parsedYear = Number.parseInt(releaseDate?.slice(0, 4) ?? "", 10);
  const runtime =
    kind === "movie"
      ? (detail.runtime ?? null)
      : (detail.episode_run_time?.[0] ?? null);
  const translations = detail.translations?.translations ?? [];
  const english =
    translations.find(
      (item) => item.iso_639_1 === "en" && item.iso_3166_1 === "US",
    ) ?? translations.find((item) => item.iso_639_1 === "en");
  const overview = english?.data?.overview?.trim() || detail.overview || null;
  const nonEmpty = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  const searchTitle =
    nonEmpty(english?.data?.title) ??
    nonEmpty(english?.data?.name) ??
    nonEmpty(kind === "movie" ? detail.original_title : detail.original_name) ??
    nonEmpty(kind === "movie" ? detail.title : detail.name) ??
    "Untitled";

  return {
    id: "tmdb:" + kind + ":" + detail.id,
    tmdbId: detail.id,
    kind,
    imdbId: detail.external_ids?.imdb_id ?? null,
    name: (kind === "movie" ? detail.title : detail.name) ?? "Untitled",
    originalName:
      (kind === "movie" ? detail.original_title : detail.original_name) ?? null,
    searchTitle,
    year: Number.isInteger(parsedYear) ? parsedYear : null,
    overview,
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    runtime,
    tmdbVote: detail.vote_average ?? null,
    tmdbVotes: detail.vote_count ?? null,
    popularity: detail.popularity ?? fallbackPopularity,
    genres: detail.genres ?? [],
    offers,
    ratings: [],
  } satisfies Title;
}

async function loadImdbRatings(): Promise<Map<string, ImdbRating>> {
  mkdirSync(dirname(imdbCache), { recursive: true });
  const cached =
    existsSync(imdbCache) &&
    Date.now() - statSync(imdbCache).mtimeMs < 24 * 60 * 60 * 1000;

  if (!cached) {
    log("downloading IMDb ratings dataset");
    const response = await fetch(IMDB_RATINGS_URL, {
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      if (!existsSync(imdbCache)) {
        throw new Error("IMDb ratings download failed: " + response.status);
      }
      log("IMDb download failed, using cached file");
    } else {
      writeFileSync(imdbCache, Buffer.from(await response.arrayBuffer()));
    }
  }

  const ratings = new Map<string, ImdbRating>();
  const lines = createInterface({
    input: createReadStream(imdbCache).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let header = true;

  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }
    const [tconst, rating, votes] = line.split("\t");
    const score = Number.parseFloat(rating);
    const count = Number.parseInt(votes, 10);
    if (tconst && Number.isFinite(score)) {
      ratings.set(tconst, {
        rating: score,
        votes: Number.isFinite(count) ? count : 0,
      });
    }
  }

  return ratings;
}

async function omdb(imdbId: string) {
  if (!omdbToken) return null;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", omdbToken);
  url.searchParams.set("i", imdbId);

  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) return null;

  const body = (await response.json()) as OmdbResponse;
  if (body.Response === "False") {
    if ((body.Error ?? "").toLowerCase().includes("invalid api key")) {
      throw new Error("OMDb: " + (body.Error ?? "request failed"));
    }
    return null;
  }

  const result: { rt?: number; mc?: number } = {};
  for (const rating of body.Ratings ?? []) {
    const score = Number.parseFloat(rating.Value.replace("%", ""));
    if (!Number.isFinite(score)) continue;
    if (rating.Source === "Rotten Tomatoes") result.rt = score;
    if (rating.Source === "Metacritic") result.mc = score;
  }
  return result;
}

async function justwatchLinks(
  title: Title,
): Promise<Map<string, string> | null> {
  const body = JSON.stringify({
    query: JUSTWATCH_QUERY,
    variables: {
      country: region,
      language: "en",
      first: 5,
      filter: { searchQuery: title.searchTitle },
    },
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(JUSTWATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return null;
      }

      const json = (await response.json()) as JwResponse;
      const wanted = title.kind === "movie" ? "MOVIE" : "SHOW";
      const nodes = (json.data?.popularTitles?.edges ?? [])
        .map((edge) => edge.node)
        .filter((node) => node.objectType === wanted);
      const chosen =
        (title.year
          ? nodes.find(
              (node) => node.content?.originalReleaseYear === title.year,
            )
          : undefined) ?? nodes[0];
      const links = new Map<string, string>();

      for (const offer of chosen?.offers ?? []) {
        const providerId = offer.package?.packageId;
        const monetization = offer.monetizationType?.toLowerCase();
        if (!providerId || !monetization || !offer.standardWebURL) continue;
        links.set(providerId + ":" + monetization, offer.standardWebURL);
      }

      return links;
    } catch {
      if (attempt === 0) await sleep(500);
    }
  }

  return null;
}

function providerStatement(provider: Provider) {
  return (
    "INSERT INTO provider (id, name, logo_path, display_priority) VALUES (" +
    [
      sqlNumber(provider.id),
      sqlString(provider.name),
      sqlString(provider.logoPath),
      sqlNumber(provider.priority),
    ].join(", ") +
    ") ON CONFLICT(id) DO UPDATE SET name=excluded.name, logo_path=excluded.logo_path, display_priority=excluded.display_priority;"
  );
}

function writeTitle(writer: SqlWriter, title: Title, timestamp: number) {
  writer.add(
    "INSERT INTO title (id, tmdb_id, kind, imdb_id, name, original_name, year, overview, poster_path, backdrop_path, runtime, tmdb_vote, tmdb_votes, popularity, updated_at) VALUES (" +
      [
        sqlString(title.id),
        sqlNumber(title.tmdbId),
        sqlString(title.kind),
        sqlString(title.imdbId),
        sqlString(title.name),
        sqlString(title.originalName),
        sqlNumber(title.year),
        sqlString(title.overview),
        sqlString(title.posterPath),
        sqlString(title.backdropPath),
        sqlNumber(title.runtime),
        sqlNumber(title.tmdbVote),
        sqlNumber(title.tmdbVotes),
        sqlNumber(title.popularity),
        sqlNumber(timestamp),
      ].join(", ") +
      ") ON CONFLICT(id) DO UPDATE SET name=excluded.name, original_name=excluded.original_name, year=excluded.year, overview=excluded.overview, poster_path=excluded.poster_path, backdrop_path=excluded.backdrop_path, runtime=excluded.runtime, tmdb_vote=excluded.tmdb_vote, tmdb_votes=excluded.tmdb_votes, popularity=excluded.popularity, imdb_id=excluded.imdb_id, updated_at=excluded.updated_at;",
  );

  writer.add(
    "DELETE FROM title_genre WHERE title_id = " + sqlString(title.id) + ";",
  );
  for (const genre of title.genres) {
    writer.add(
      "INSERT INTO genre (id, name) VALUES (" +
        sqlNumber(genre.id) +
        ", " +
        sqlString(genre.name) +
        ") ON CONFLICT(id) DO UPDATE SET name=excluded.name;",
    );
    writer.add(
      "INSERT OR IGNORE INTO title_genre (title_id, genre_id) VALUES (" +
        sqlString(title.id) +
        ", " +
        sqlNumber(genre.id) +
        ");",
    );
  }

  writer.add(
    "DELETE FROM offer WHERE title_id = " +
      sqlString(title.id) +
      " AND region = " +
      sqlString(region) +
      ";",
  );
  for (const offer of title.offers) {
    writer.add(providerStatement(offer.provider));
    writer.add(
      "INSERT INTO offer (title_id, provider_id, region, monetization, link, updated_at) VALUES (" +
        [
          sqlString(title.id),
          sqlNumber(offer.provider.id),
          sqlString(region),
          sqlString(offer.monetization),
          sqlString(offer.link),
          sqlNumber(timestamp),
        ].join(", ") +
        ") ON CONFLICT(title_id, provider_id, region, monetization) DO UPDATE SET link=excluded.link, updated_at=excluded.updated_at;",
    );
  }

  for (const rating of title.ratings) {
    writer.add(
      "INSERT INTO rating (title_id, source, score, scale, votes, url, fetched_at) VALUES (" +
        [
          sqlString(title.id),
          sqlString(rating.source),
          sqlNumber(rating.score),
          sqlNumber(rating.scale),
          sqlNumber(rating.votes),
          sqlString(rating.url),
          sqlNumber(timestamp),
        ].join(", ") +
        ") ON CONFLICT(title_id, source) DO UPDATE SET score=excluded.score, scale=excluded.scale, votes=excluded.votes, url=excluded.url, fetched_at=excluded.fetched_at;",
    );
  }

  writer.add(
    "DELETE FROM title_fts WHERE title_id = " + sqlString(title.id) + ";",
  );
  writer.add(
    "INSERT INTO title_fts (title_id, name, original_name, overview) VALUES (" +
      [
        sqlString(title.id),
        sqlString(title.name),
        sqlString(title.originalName),
        sqlString(title.overview),
      ].join(", ") +
      ");",
  );
}

async function main() {
  const startedAt = Math.floor(Date.now() / 1000);
  const providers = await resolveProviders();

  if (providers.length === 0) {
    throw new Error("No providers resolved for region " + region);
  }

  log(
    "providers " +
      providers.length +
      ": " +
      providers.map((provider) => provider.id + "=" + provider.name).join(", "),
  );

  if (omdbToken) {
    log("checking OMDb key");
    await omdb("tt0137523");
  }

  const writer = new SqlWriter(out, chunkBytes, dryRun);
  for (const provider of providers) writer.add(providerStatement(provider));

  const found = new Map<
    string,
    { kind: Kind; id: number; popularity: number }
  >();

  for (const provider of providers) {
    for (const kind of ["movie", "series"] as const) {
      for (let page = 1; page <= pages; page += 1) {
        const result = await discover(kind, provider.id, page);
        for (const item of result.results) {
          const foundKey = kind + ":" + item.id;
          const current = found.get(foundKey);
          found.set(foundKey, {
            kind,
            id: item.id,
            popularity: Math.max(
              current?.popularity ?? 0,
              item.popularity ?? 0,
            ),
          });
        }
        log(
          "discover " +
            kind +
            " provider=" +
            provider.id +
            " page=" +
            page +
            "/" +
            Math.min(pages, result.total_pages) +
            " +" +
            result.results.length,
        );
        if (page >= result.total_pages) break;
        await sleep(50);
      }
    }
  }

  const items = [...found.values()]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);

  log("found " + found.size + " titles, selecting " + items.length);

  const imdb = useImdb
    ? await loadImdbRatings()
    : new Map<string, ImdbRating>();
  if (useImdb) log("IMDb ratings loaded: " + imdb.size);

  let failures = 0;
  let titles = 0;
  let offers = 0;
  let omdbCalls = 0;
  let omdbExhausted = false;
  let deepLinkCount = 0;
  let justWatchFailures = 0;
  let justWatchDisabled = !useJustWatch;

  for (const [index, item] of items.entries()) {
    try {
      const detail = await titleDetail(item.kind, item.id);
      const title = toTitle(item.kind, detail, item.popularity);

      if (title.imdbId && imdb.has(title.imdbId)) {
        const rating = imdb.get(title.imdbId)!;
        title.ratings.push({
          source: "imdb",
          score: rating.rating,
          scale: 10,
          votes: rating.votes,
          url: "https://www.imdb.com/title/" + title.imdbId + "/",
        });
      }

      if (title.tmdbVote !== null) {
        title.ratings.push({
          source: "tmdb",
          score: title.tmdbVote,
          scale: 10,
          votes: title.tmdbVotes,
          url: null,
        });
      }

      if (
        title.imdbId &&
        omdbToken &&
        omdbCalls < omdbLimit &&
        !omdbExhausted
      ) {
        const scores = await omdb(title.imdbId);
        omdbCalls += 1;
        if (scores?.rt !== undefined) {
          title.ratings.push({
            source: "rt",
            score: scores.rt,
            scale: 100,
            votes: null,
            url: null,
          });
        }
        if (scores?.mc !== undefined) {
          title.ratings.push({
            source: "metacritic",
            score: scores.mc,
            scale: 100,
            votes: null,
            url: null,
          });
        }
        await sleep(50);
      }

      let linked = 0;
      if (!justWatchDisabled) {
        const deepLinks = await justwatchLinks(title);
        if (deepLinks === null) {
          justWatchFailures += 1;
          if (justWatchFailures >= 5) {
            justWatchDisabled = true;
            log("JustWatch disabled after 5 failures");
          }
        } else {
          for (const offer of title.offers) {
            const deepLink =
              deepLinks.get(offer.provider.id + ":" + offer.monetization) ??
              null;
            offer.link = deepLink;
            if (deepLink) {
              linked += 1;
              deepLinkCount += 1;
            }
          }
        }
        await sleep(justwatchDelay);
      }

      writeTitle(writer, title, startedAt);
      titles += 1;
      offers += title.offers.length;
      log(
        "title " +
          (index + 1) +
          "/" +
          items.length +
          " " +
          title.id +
          " offers=" +
          title.offers.length +
          " links=" +
          linked,
      );
      await sleep(40);
    } catch (error) {
      failures += 1;
      console.error("failed " + item.kind + ":" + item.id, error);
    }
  }

  const finishedAt = Math.floor(Date.now() / 1000);
  writer.add(
    "INSERT INTO ingest_run (region, started_at, finished_at, titles_seen, offers_upserted, status) VALUES (" +
      [
        sqlString(region),
        sqlNumber(startedAt),
        sqlNumber(finishedAt),
        sqlNumber(titles),
        sqlNumber(offers),
        sqlString(failures === 0 ? "ok" : "failed"),
      ].join(", ") +
      ");",
  );

  const files = writer.finish();

  log(
    "done: " +
      titles +
      " titles, " +
      offers +
      " offers, " +
      deepLinkCount +
      " deep links, " +
      failures +
      " failures, " +
      omdbCalls +
      " OMDb calls, " +
      writer.statements +
      " statements",
  );
  if (files.length > 0) {
    log("wrote " + files.length + " chunks to " + out + ".part-*.sql");
  }

  if (titles === 0) process.exit(1);
}

await main();
