import { env } from "cloudflare:workers";
import { EMPTY_PROFILE, parseProfile, type ProfileState } from "~/lib/profile";

export async function getProfile(userId: string): Promise<ProfileState> {
  const row = await env.DB.prepare(
    "SELECT data FROM user_profile WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ data: string }>();

  if (!row) return parseProfile(null);
  try {
    return parseProfile(JSON.parse(row.data));
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(
  userId: string,
  state: ProfileState,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO user_profile (user_id, data, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at",
  )
    .bind(userId, JSON.stringify(state), Date.now())
    .run();
}
