import { countryFromRequest } from "~/lib/country.server";
import { EMBEDDING_MODEL, EMBEDDING_MODEL_KEY } from "~/lib/ai/embedding";
import { runQuery } from "~/server/effect.server";
import { searchSemanticTitles } from "~/server/semantic.server";
import type { Route } from "./+types/api.search.semantic";

interface SearchBody {
  vector?: unknown;
  services?: unknown;
  kind?: unknown;
  minRating?: unknown;
  decade?: unknown;
  reference?: unknown;
  model?: unknown;
  dim?: unknown;
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 32_000) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vector =
    Array.isArray(body.vector) &&
    body.vector.length === EMBEDDING_MODEL.dim &&
    body.vector.every((value) => typeof value === "number")
      ? (body.vector as number[])
      : null;

  if (!vector || !vector.every(Number.isFinite)) {
    return Response.json(
      { error: "A valid query vector is required" },
      { status: 400 },
    );
  }

  if (body.model !== EMBEDDING_MODEL_KEY || body.dim !== EMBEDDING_MODEL.dim) {
    return Response.json(
      { error: "Unsupported embedding model" },
      { status: 400 },
    );
  }

  const services = Array.isArray(body.services)
    ? [
        ...new Set(
          body.services.filter(
            (id): id is number => Number.isInteger(id) && Number(id) > 0,
          ),
        ),
      ].slice(0, 20)
    : [];

  const kind =
    body.kind === "movie" || body.kind === "series" ? body.kind : undefined;

  const minRating =
    typeof body.minRating === "number" &&
    Number.isFinite(body.minRating) &&
    body.minRating > 0 &&
    body.minRating <= 10
      ? body.minRating
      : 0;

  const decade =
    typeof body.decade === "number" &&
    Number.isInteger(body.decade) &&
    body.decade >= 1900 &&
    body.decade <= 2030 &&
    body.decade % 10 === 0
      ? body.decade
      : undefined;

  const reference =
    typeof body.reference === "string"
      ? body.reference.trim().slice(0, 120) || null
      : null;

  const country = countryFromRequest(request);
  const result = await runQuery(
    searchSemanticTitles(country, services, vector, {
      kind,
      limit: 18,
      minRating,
      decade,
      reference,
    }),
  );

  return Response.json(result);
}
