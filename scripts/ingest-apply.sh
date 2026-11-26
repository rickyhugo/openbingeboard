#!/usr/bin/env bash
set -euo pipefail

if [[ "${CI:-}" != "true" && "${CONFIRM:-}" != "1" ]]; then
	echo "Refusing to write to the remote D1 database." >&2
	echo "Set CONFIRM=1 to continue, or run 'pnpm ingest' for a local SQL file." >&2
	exit 1
fi

tsx scripts/ingest.ts --out db/generated/ingest.sql "$@"
wrangler d1 execute openbingeboard --remote --file=db/generated/ingest.sql
