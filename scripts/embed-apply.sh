#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f db/generated/title-embeddings.sql
pnpm exec tsx scripts/embed-titles.ts --out=db/generated/title-embeddings.sql
if [ ! -s db/generated/title-embeddings.sql ]; then
	echo "No embedding changes."
	exit 0
fi
pnpm exec wrangler d1 execute openbingeboard --remote --file=db/generated/title-embeddings.sql
