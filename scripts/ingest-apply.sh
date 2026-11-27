#!/usr/bin/env bash
set -euo pipefail

if [[ "${CI:-}" != "true" && "${CONFIRM:-}" != "1" ]]; then
	echo "Refusing to write to the remote D1 database." >&2
	echo "Set CONFIRM=1 to continue, or run 'pnpm ingest' for a local SQL file." >&2
	exit 1
fi

REGIONS="${REGIONS:-SE,DK,FI,NO,IS}"
IFS=',' read -r -a region_list <<<"$REGIONS"
shopt -s nullglob

for region in "${region_list[@]}"; do
	region="${region// /}"
	echo "==> ingesting ${region}"

	rm -f db/generated/ingest.part-*.sql
	tsx scripts/ingest.ts --out=db/generated/ingest "$@" --region="$region"

	files=(db/generated/ingest.part-*.sql)
	if ((${#files[@]} == 0)); then
		echo "No SQL chunks generated for ${region}." >&2
		exit 1
	fi

	for file in "${files[@]}"; do
		echo "applying ${file}"
		wrangler d1 execute openbingeboard --remote --file "${file}"
	done
done
