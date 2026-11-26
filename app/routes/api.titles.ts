import { runQuery } from "~/server/effect.server";
import { getTitlesByIds } from "~/server/extras.server";
import type { Route } from "./+types/api.titles";

export async function loader({ request }: Route.LoaderArgs) {
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .filter(Boolean),
    ),
  ].slice(0, 100);

  const titles = ids.length > 0 ? await runQuery(getTitlesByIds(ids)) : [];

  return Response.json({ titles });
}
