import { countryFromRequest } from "~/lib/country.server";
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { getTitlesByIds, getTitlesWithOffers } from "~/server/extras.server";
import type { Route } from "./+types/api.titles";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const ids = [
    ...new Set((url.searchParams.get("ids") ?? "").split(",").filter(Boolean)),
  ].slice(0, 100);

  if (url.searchParams.get("offers") === "1") {
    const country = countryFromRequest(request);
    const result =
      ids.length > 0
        ? await cached(
            `library:offers:${country}:${ids.join(",")}`,
            60_000,
            () => runQuery(getTitlesWithOffers(country, ids)),
          )
        : { titles: [], offers: {} };
    return Response.json(result);
  }

  const titles =
    ids.length > 0
      ? await cached(`library:titles:${ids.join(",")}`, 60_000, () =>
          runQuery(getTitlesByIds(ids)),
        )
      : [];

  return Response.json({ titles, offers: {} });
}
