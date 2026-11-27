#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f db/generated/title-embeddings.sql
tsx scripts/embed-titles.ts --out=db/generated/title-embeddings.sql
wrangler d1 execute openbingeboard --remote --file=db/generated/title-embeddings.sql
