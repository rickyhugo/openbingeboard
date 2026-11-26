#!/usr/bin/env bash
set -euo pipefail

if [[ "${CI:-}" != "true" && "${CONFIRM:-}" != "1" ]]; then
	echo "Refusing to write to the remote D1 database." >&2
	echo "Set CONFIRM=1 to continue, or run 'pnpm ingest' for a local SQL file." >&2
	exit 1
fi

rm -f db/generated/ingest.part-*.sql
tsx scripts/ingest.ts --out db/generated/ingest "$@"

shopt -s nullglob
files=(db/generated/ingest.part-*.sql)

if ((${#files[@]} == 0)); then
	echo "No SQL chunks generated." >&2
	exit 1
fi

for file in "${files[@]}"; do
	echo "applying ${file}"
	wrangler d1 execute openbingeboard --remote --file "${file}"
done
