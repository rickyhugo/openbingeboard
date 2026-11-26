PRAGMA foreign_keys = ON;

CREATE TABLE title (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'series')),
  imdb_id TEXT,
  name TEXT NOT NULL,
  original_name TEXT,
  year INTEGER,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  runtime INTEGER,
  tmdb_vote REAL,
  tmdb_votes INTEGER,
  popularity REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE (kind, tmdb_id)
);

CREATE TABLE genre (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE title_genre (
  title_id TEXT NOT NULL REFERENCES title(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
  PRIMARY KEY (title_id, genre_id)
);

CREATE TABLE rating (
  title_id TEXT NOT NULL REFERENCES title(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('imdb', 'rt', 'metacritic', 'tmdb')),
  score REAL NOT NULL,
  scale REAL NOT NULL,
  votes INTEGER,
  url TEXT,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (title_id, source)
);

CREATE TABLE provider (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  logo_path TEXT,
  display_priority INTEGER NOT NULL DEFAULT 1000
);

CREATE TABLE offer (
  title_id TEXT NOT NULL REFERENCES title(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES provider(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  monetization TEXT NOT NULL CHECK (
    monetization IN ('flatrate', 'rent', 'buy', 'ads', 'free')
  ),
  link TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (title_id, provider_id, region, monetization)
);

CREATE TABLE ingest_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  titles_seen INTEGER NOT NULL DEFAULT 0,
  offers_upserted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (
    status IN ('running', 'ok', 'failed')
  ),
  error TEXT
);

CREATE VIRTUAL TABLE title_fts USING fts5(
  title_id UNINDEXED,
  name,
  original_name,
  overview,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE INDEX idx_title_kind_year ON title (kind, year);
CREATE INDEX idx_title_popularity ON title (popularity DESC);
CREATE INDEX idx_offer_title ON offer (title_id);
CREATE INDEX idx_offer_region_offer
  ON offer (region, monetization, provider_id);
CREATE INDEX idx_rating_source_score ON rating (source, score DESC);
