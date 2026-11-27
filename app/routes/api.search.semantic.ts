import { countryFromRequest } from "~/lib/country.server";
import { EMBEDDING_MODEL } from "~/lib/ai/embedding";
import { runQuery } from "~/server/effect.server";
import { searchSemanticTitles } from "~/server/semantic.server";
import type { Route } from "./+types/api.search.semantic";

interface SearchBody {
  vector?: unknown;
  services?: unknown;
  model?: unknown;
  dim?: unknown;
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
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

  if (body.model !== EMBEDDING_MODEL.id || body.dim !== EMBEDDING_MODEL.dim) {
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

  const country = countryFromRequest(request);
  const result = await runQuery(
    searchSemanticTitles(country, services, vector, 18),
  );

  return Response.json(result);
}
