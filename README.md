# OpenBingeBoard

Find what is available to stream, rent, or buy in Sweden, with IMDb, Rotten Tomatoes, and Metacritic scores in the same view.

The first region is `SE`. Availability is stored per region, so adding another country is data, not a schema change.

Live at [openbingeboard.hugoplanet.se](https://openbingeboard.hugoplanet.se).

## Stack

- React Router v8 (framework mode) on Cloudflare Workers
- Effect v4 for data access
- Cloudflare D1 (SQLite) with FTS5 search
- shadcn/ui, Lyra style
- mise for tools, hk for Git hooks, Doppler for secrets

## Setup

```sh
mise install
doppler login
doppler setup --project openbingeboard --config dev
hk install --mise
pnpm install
pnpm db:migrate:local
pnpm db:seed
pnpm dev
```

`doppler.yaml` pins the project and the `dev` config. It contains no secrets. The local database lives in `.wrangler/state`, and `pnpm db:reset` rebuilds it.

## Secrets

Values come from Doppler and reach the process through `doppler run`. Nothing secret is committed, and no secret is written into the repository.

| Variable                | Configs      | Used by           |
| ----------------------- | ------------ | ----------------- |
| `TMDB_API_KEY`          | `dev`, `prd` | ingest            |
| `OMDB_API_KEY`          | `dev`, `prd` | ingest            |
| `CLOUDFLARE_API_TOKEN`  | `prd`        | deploy, remote D1 |
| `CLOUDFLARE_ACCOUNT_ID` | `prd`        | deploy, remote D1 |

Set the ingest keys once per config:

```sh
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config dev
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config prd
```

This repo uses a repo-scoped Doppler CLI token for the `hugoplanet` workplace. The global CLI token stays on `vvh`, so other projects keep working. The project is `openbingeboard` in `hugoplanet`.

GitHub Actions uses one read-only Doppler service token scoped to the `prd` config, stored as the repository secret `DOPPLER_TOKEN`. No other secrets live in GitHub. The ingest workflow fails fast if the key is missing.

The Worker needs no runtime secrets today, because it only reads D1. If a runtime secret appears, keep Doppler as the source of truth and push it with `wrangler secret put NAME`.

To share access, invite the person to the `openbingeboard` project in the `hugoplanet` workplace. They run `doppler login` and `doppler setup` in the repo, and the same `doppler.yaml` selects the project. Revoking access is one dashboard action.

`pnpm secrets` lists variable names without values. `hk` runs `detect_private_key` and `check_added_large_files` before every commit.

## Commands

| Command                  | What it does                                             |
| ------------------------ | -------------------------------------------------------- |
| `pnpm dev`               | Vite dev server with the Worker runtime                  |
| `pnpm build`             | Production build                                         |
| `pnpm typecheck`         | Regenerate Worker types and route types, then type-check |
| `pnpm db:migrate:local`  | Apply D1 migrations locally                              |
| `pnpm db:seed`           | Load the demo catalogue into the local database          |
| `pnpm db:reset`          | Rebuild the local database from scratch                  |
| `pnpm ingest`            | Generate `db/generated/ingest.sql` through Doppler       |
| `pnpm ingest:dry`        | Fetch from TMDB and OMDb but write nothing               |
| `pnpm ingest:apply:prd`  | Generate and apply the SQL to remote D1                  |
| `pnpm db:migrate:remote` | Apply migrations to remote D1                            |
| `hk check --all`         | Run the same checks as the pre-commit hook               |

`pnpm ingest:apply` and `pnpm ingest:apply:prd` refuse to write to the remote database unless `CI=true` or `CONFIRM=1` is set.

## Data model

`title` holds a film or series. `rating` has one row per source, so adding a source is an insert. `offer` is keyed by `(title_id, provider_id, region, monetization)`, which makes a missing region impossible. `title_fts` is an FTS5 table for search, and `ingest_run` records each nightly refresh.

## Getting API keys

TMDB:

1. Create an account at [themoviedb.org/signup](https://www.themoviedb.org/signup) and verify the email.
2. Open [Settings → API](https://www.themoviedb.org/settings/api) and request a developer key.
3. Use the site URL `https://openbingeboard.hugoplanet.se` and describe it as a non-commercial streaming availability catalogue.
4. Copy either the v3 API key or the v4 read access token. Both work as `TMDB_API_KEY`.

OMDb:

1. Open [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
2. Choose the free tier and submit your email.
3. Open the activation email and click the link.
4. Copy the key.

```sh
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config dev
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config prd
```

The free OMDb tier allows 1,000 requests per day. Each title with an IMDb id costs one request, so a full backfill of several thousand titles takes multiple nightly runs or a paid OMDb tier.

## Ingest

`scripts/ingest.ts` reads TMDB discover endpoints for the configured providers, expands each result with `append_to_response=external_ids,watch/providers`, and adds OMDb scores when an IMDb id exists. It writes idempotent SQL instead of talking to D1 directly, so the workflow applies the file with `wrangler d1 execute`.

```sh
pnpm ingest:dry -- --providers=8,76,119 --pages=2 --limit=60
pnpm ingest -- --pages=2 --limit=60
```

Provider ids default to Netflix (8), Viaplay (76), and Amazon Prime Video (119).

`.github/workflows/ingest.yml` runs at 04:00 UTC and applies the result. It authenticates with `DOPPLER_TOKEN` and reads the Cloudflare credentials from the `prd` config.

## Deploy

The production D1 database is `be5efb5b-b4fd-4409-a38f-4def80adc89a`. The Worker is bound to `openbingeboard.hugoplanet.se` as a custom domain, and `workers.dev` is disabled. Both are declared in `wrangler.jsonc`.

```sh
wrangler login
pnpm db:migrate:remote
pnpm deploy
```

`wrangler login` is only needed once per machine. CI needs a Cloudflare API token with Workers Scripts Edit, D1 Edit, and Workers Routes Edit in the `prd` Doppler config, plus `CLOUDFLARE_ACCOUNT_ID`.

## Licensing

TMDB's free API is non-commercial only and requires TMDB attribution. The watch provider data is powered by JustWatch and requires JustWatch attribution. OMDb content is CC BY-NC 4.0. This project is non-commercial. Ads, paid access, or any revenue requires a commercial agreement with TMDB and a ratings source that permits commercial use.

Rotten Tomatoes has no public API. Scores arrive through OMDb. TMDB has no prices and no season-level availability.
