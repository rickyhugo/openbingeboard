# OpenBingeBoard

Find what is available to stream, rent, or buy, with IMDb, Rotten Tomatoes, and Metacritic scores in the same view.

Supported countries are Sweden (`SE`), Norway (`NO`), Denmark (`DK`), Finland (`FI`), and Iceland (`IS`). Availability is stored per region. The selected country is a cookie-backed setting, saved in the profile for signed-in users.

Live at [openbingeboard.com](https://openbingeboard.com).

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
echo "EMAIL_FROM=OpenBingeBoard <noreply@openbingeboard.com>" >> .dev.vars
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

Email verification and password reset send through Resend when `RESEND_API_KEY` is set. Without it, `EMAIL_DEV=1` logs the links in development, and production leaves email verification off so sign-up still works. The sending domain and scoped key are managed by `hugoplanet-infrastructure/resend`; see that README for the two-phase Terraform apply.

To share access, invite the person to the `openbingeboard` project in the `hugoplanet` workplace. They run `doppler login` and `doppler setup` in the repo, and the same `doppler.yaml` selects the project. Revoking access is one dashboard action.

`pnpm secrets` lists variable names without values. `hk` runs `detect_private_key` and `check_added_large_files` before every commit.

## Accounts

Browse and filter without an account. Guests keep country, services, saved views, watched, and want-to-watch in localStorage and a country cookie.

Signing in stores the same profile as a JSON document in `user_profile` and merges guest data on first sign-in. The country setting syncs too. Better Auth owns `user`, `session`, `account`, and `verification`. The forms live at `/login`, with password reset at `/reset-password`.

The profile page includes account details, display-name editing, password changes, email verification status, resend verification, and sign out. Only email and password sign-in is enabled. Sign-up requires verification only when an email sender is configured.

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
| `pnpm embed:apply:prd`   | Embed changed titles and apply vectors to remote D1      |
| `pnpm models:sync`       | Upload the pinned model and ONNX runtime to R2           |
| `pnpm models:check`      | Verify the R2 copies match the local files               |
| `pnpm eval:semantic`     | Run the semantic ranking spot checks                     |
| `pnpm db:reset`          | Rebuild the local database from scratch                  |
| `pnpm ingest`            | Generate `db/generated/ingest.sql` through Doppler       |
| `pnpm ingest:dry`        | Fetch from TMDB and OMDb but write nothing               |
| `pnpm ingest:apply:prd`  | Generate and apply the SQL to remote D1                  |
| `pnpm db:migrate:remote` | Apply migrations to remote D1                            |
| `hk check --all`         | Run the same checks as the pre-commit hook               |

`pnpm ingest:apply` and `pnpm ingest:apply:prd` refuse to write to the remote database unless `CI=true` or `CONFIRM=1` is set.

## Semantic search

`/ask` embeds the query in a Web Worker with `Xenova/bge-small-en-v1.5` and sends the vector, parsed filters, and a reference title name when one is present to the search API. The description itself is not sent. `title_embedding` stores the matching title vectors as base64 float32 data.

The model revision is pinned in `app/lib/ai/embedding.ts`. Both the model files and the ONNX runtime come from the `openbingeboard-models` R2 bucket at `models.openbingeboard.com`, so the site does not depend on Hugging Face or a public CDN at runtime.

Ask parses structured constraints from the prompt. "IMDb 7+", "at least 8 on IMDb", "from the 90s", and "series" become server filters. A prompt that names a title, such as "similar to Breaking Bad", uses that title's stored vector to anchor the candidate pool, and the named title is left out of the results. The rating and decade filters are hard constraints; the title anchor and the rest of the description only influence ranking.

Semantic search is opt-in. Enabling it downloads about 62 MB once; the browser caches the files. `title_embedding` stores base64 float32 vectors and a hash of the embedding input, so `pnpm embed:apply:prd` only re-embeds titles that changed. Changing the revision or dtype changes `EMBEDDING_MODEL_KEY`, which invalidates every stored vector and forces a full re-embed. Run `pnpm models:sync` before deploying a new revision.

## Data model

`title` holds a film or series. `rating` has one row per source, so adding a source is an insert. `offer` is keyed by `(title_id, provider_id, region, monetization)`, which makes a missing region impossible. `title_fts` is an FTS5 table for search, and `ingest_run` records each nightly refresh.

## Getting API keys

TMDB:

1. Create an account at [themoviedb.org/signup](https://www.themoviedb.org/signup) and verify the email.
2. Open [Settings → API](https://www.themoviedb.org/settings/api) and request a developer key.
3. Use the site URL `https://openbingeboard.com` and describe it as a non-commercial streaming availability catalogue.
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

`scripts/ingest.ts` pages the configured providers for one country, ranks the union by popularity, and expands each title with `append_to_response=external_ids,watch/providers`. It requests English metadata by default; pass `--language=sv-SE` only for a deliberately localized run. Pass `--region=DK` to choose the country. Offer rows are keyed by region, so the five Nordic catalogues share one title table. IMDb scores come from the daily `datasets.imdbws.com` ratings file, so they cost no API requests. OMDb supplies Rotten Tomatoes and Metacritic for the first `--omdb-limit` titles. JustWatch search fills each offer with the provider's own URL, which opens the service app on mobile when the provider supports universal links. Output is split into idempotent SQL chunks.

```sh
pnpm ingest:dry -- --region=DK --pages=1 --limit=20
pnpm ingest -- --region=SE --pages=10 --limit=1000 --omdb-limit=200

# Refresh every Nordic catalogue in sequence (default REGIONS).
REGIONS=SE,DK,FI,NO,IS pnpm ingest:apply:prd -- --pages=2 --limit=60
```

The default list covers Netflix, Prime Video, Disney+, Viaplay, SkyShowtime, HBO Max, TV4 Play, SVT Play, SF Anytime, Rakuten TV, Apple TV, Blockbuster, Pluto TV, MUBI, Crunchyroll, and Tele2 Play. Use `--providers=auto` to select by TMDB display priority, or pass explicit ids.

`.github/workflows/ingest.yml` runs at 04:00 UTC and applies the result for every region in `REGIONS` (default `SE,DK,FI,NO,IS`). It authenticates with `DOPPLER_TOKEN` and reads the Cloudflare credentials from the `prd` config.

## Deploy

The D1 database `be5efb5b-b4fd-4409-a38f-4def80adc89a` and the custom domains `openbingeboard.com` and `www.openbingeboard.com` are owned by Terraform in `hugoplanet-infrastructure/modules/bingeboard`. The Worker script and its secret stay in Wrangler. `wrangler.jsonc` declares the account, the D1 binding, and `workers_dev = false`; it deliberately does not declare the custom domains, because a Wrangler deploy replaces the Worker's domain set and would fight Terraform.

The Worker redirects `www` to the apex and plain HTTP to HTTPS with a 308. Terraform also sets Cloudflare's `always_use_https` zone setting so HTTP is redirected at the edge before it reaches the Worker.

```sh
pnpm db:migrate:remote
pnpm deploy
```

The `prd` Doppler config holds the Terraform-created app token as `CLOUDFLARE_API_TOKEN`. That token allows Workers Scripts Edit and D1 Edit for this account, plus Zone Read, DNS Edit, Workers Routes Edit, and Zone Settings Write for the app zone. Do not add the custom domain back to `wrangler.jsonc`, and do not recreate the D1 database by hand. Change the domain or database in Terraform instead.

## Licensing

TMDB's free API is non-commercial only and requires TMDB attribution. The watch provider data is powered by JustWatch and requires JustWatch attribution. OMDb content is CC BY-NC 4.0. This project is non-commercial. Ads, paid access, or any revenue requires a commercial agreement with TMDB and a ratings source that permits commercial use.

Rotten Tomatoes has no public API. Scores arrive through OMDb. TMDB has no prices and no season-level availability.
