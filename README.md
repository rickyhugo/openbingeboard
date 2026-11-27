# OpenBingeBoard

Find what is available to stream, rent, or buy in Sweden, with IMDb, Rotten Tomatoes, and Metacritic scores in the same view.

The first region is `SE`. Availability is stored per region, so adding another country is data, not a schema change.

Live at [openbingeboard.hugoplanet.se](https://openbingeboard.hugoplanet.se).

## Stack

- React Router v8 (framework mode) on Cloudflare Workers
- Effect v4 for data access
- Cloudflare D1 (SQLite) with FTS5 search
- shadcn/ui, Lyra style
- Better Auth for accounts, with guest mode
- mise for tools, hk for Git hooks, Doppler for secrets

## Setup

```sh
mise install
doppler login
doppler setup --project openbingeboard --config dev
hk install --mise
pnpm install
echo "BETTER_AUTH_URL=http://localhost:5173" > .dev.vars
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .dev.vars
echo "EMAIL_DEV=1" >> .dev.vars
echo "EMAIL_FROM=OpenBingeBoard <noreply@hugoplanet.se>" >> .dev.vars
pnpm db:migrate:local
pnpm db:seed
pnpm dev
```

`doppler.yaml` pins the project and the `dev` config. It contains no secrets. The local database lives in `.wrangler/state`, and `pnpm db:reset` rebuilds it.

## Secrets

Values come from Doppler and reach the process through `doppler run`. Nothing secret is committed, and no secret is written into the repository.

| Variable                | Configs      | Used by            |
| ----------------------- | ------------ | ------------------ |
| `TMDB_API_KEY`          | `dev`, `prd` | ingest             |
| `OMDB_API_KEY`          | `dev`, `prd` | ingest             |
| `CLOUDFLARE_API_TOKEN`  | `prd`        | deploy, remote D1  |
| `CLOUDFLARE_ACCOUNT_ID` | `prd`        | account lookup     |
| `BETTER_AUTH_SECRET`    | `dev`, `prd` | auth sessions      |
| `RESEND_API_KEY`        | `prd`        | verification email |
| `EMAIL_FROM`            | `dev`, `prd` | email sender       |

Set the ingest keys once per config:

```sh
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config dev
doppler secrets set TMDB_API_KEY=... OMDB_API_KEY=... --config prd
```

This repo uses a repo-scoped Doppler CLI token for the `hugoplanet` workplace. The global CLI token stays on `vvh`, so other projects keep working. The project is `openbingeboard` in `hugoplanet`.

GitHub Actions uses one read-only Doppler service token scoped to the `prd` config, stored as the repository secret `DOPPLER_TOKEN`. No other secrets live in GitHub. The ingest workflow fails fast if the key is missing.

The Worker needs `BETTER_AUTH_SECRET` at runtime. Keep it in Doppler and push it with `wrangler secret put BETTER_AUTH_SECRET`. Local development reads it from `.dev.vars`. `BETTER_AUTH_URL` is a public var in `wrangler.jsonc`.

Email verification and password reset send through Resend when `RESEND_API_KEY` is set. Without it, `EMAIL_DEV=1` logs the links in development, and production leaves email verification off so sign-up still works. Verify `hugoplanet.se` in Resend before setting the key.

To share access, invite the person to the `openbingeboard` project in the `hugoplanet` workplace. They run `doppler login` and `doppler setup` in the repo, and the same `doppler.yaml` selects the project. Revoking access is one dashboard action.

`pnpm secrets` lists variable names without values. `hk` runs `detect_private_key` and `check_added_large_files` before every commit.

## Accounts

Browse and filter without an account. Guests keep services, saved views, watched, and want-to-watch in localStorage.

Signing in stores the same profile as a JSON document in `user_profile` and merges guest data on first sign-in. Better Auth owns `user`, `session`, `account`, and `verification`. The forms live at `/login`, with password reset at `/reset-password`.

Only email and password sign-in is enabled. Sign-up requires verification only when an email sender is configured.

```sh
wrangler secret put BETTER_AUTH_SECRET
```

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

The free OMDb tier allows 1,000 requests per day. IMDb scores come from the bulk IMDb dataset and cost no requests. Only Rotten Tomatoes and Metacritic calls use OMDb, so keep `--omdb-limit` under the daily quota.

## Ingest

`scripts/ingest.ts` pages the configured Swedish providers, ranks the union by popularity, and expands each title with `append_to_response=external_ids,watch/providers`. IMDb scores come from the daily `datasets.imdbws.com` ratings file, so they cost no API requests. OMDb supplies Rotten Tomatoes and Metacritic for the first `--omdb-limit` titles. JustWatch search fills each offer with the provider's own URL, which opens the service app on mobile when the provider supports universal links. Output is split into idempotent SQL chunks.

```sh
pnpm ingest:dry -- --providers=8 --pages=1 --limit=20
pnpm ingest -- --pages=10 --limit=1000 --omdb-limit=200
```

The default list covers Netflix, Prime Video, Disney+, Viaplay, SkyShowtime, HBO Max, TV4 Play, SVT Play, SF Anytime, Rakuten TV, Apple TV, Blockbuster, Pluto TV, MUBI, Crunchyroll, and Tele2 Play. Use `--providers=auto` to select by TMDB display priority, or pass explicit ids.

`.github/workflows/ingest.yml` runs at 04:00 UTC and applies the result. It authenticates with `DOPPLER_TOKEN` and reads the Cloudflare credentials from the `prd` config.

## Deploy

The D1 database `be5efb5b-b4fd-4409-a38f-4def80adc89a` and the custom domain `openbingeboard.hugoplanet.se` are owned by Terraform in `hugoplanet-infrastructure/modules/bingeboard`. The Worker script and its secret stay in Wrangler. `wrangler.jsonc` declares the account, the D1 binding, and `workers_dev = false`; it deliberately does not declare the custom domain, because a Wrangler deploy replaces the Worker's domain set and would fight Terraform.

```sh
pnpm db:migrate:remote
pnpm deploy
```

The `prd` Doppler config holds the Terraform-created app token as `CLOUDFLARE_API_TOKEN`. That token allows Workers Scripts Edit and D1 Edit for this account, plus Zone Read and DNS Edit for the app hostname. Do not add the custom domain back to `wrangler.jsonc`, and do not recreate the D1 database by hand. Change the domain or database in Terraform instead.

## Licensing

TMDB's free API is non-commercial only and requires TMDB attribution. The watch provider data is powered by JustWatch and requires JustWatch attribution. OMDb content is CC BY-NC 4.0. This project is non-commercial. Ads, paid access, or any revenue requires a commercial agreement with TMDB and a ratings source that permits commercial use.

Rotten Tomatoes has no public API. Scores arrive through OMDb. TMDB has no prices and no season-level availability.
