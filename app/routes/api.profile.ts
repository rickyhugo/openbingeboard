import { parseProfile } from "~/lib/profile";
import { auth } from "~/server/auth.server";
import { getProfile, saveProfile } from "~/server/profile.server";
import type { Route } from "./+types/api.profile";

async function currentUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await currentUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await getProfile(user.id));
}

export async function action({ request }: Route.ActionArgs) {
  const user = await currentUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (request.method !== "PUT") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const state = parseProfile(await request.json());
  await saveProfile(user.id, state);
  return Response.json({ ok: true });
}
