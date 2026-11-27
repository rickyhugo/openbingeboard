import { DEFAULT_COUNTRY, parseCountry, type CountryCode } from "./countries";

export interface SavedFilter {
  id: string;
  name: string;
  query: string;
}

export interface ProfileState {
  country: CountryCode;
  services: number[];
  watched: string[];
  want: string[];
  saved: SavedFilter[];
}

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
}

export const EMPTY_PROFILE: ProfileState = {
  country: DEFAULT_COUNTRY,
  services: [],
  watched: [],
  want: [],
  saved: [],
};

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export function parseProfile(value: unknown): ProfileState {
  if (value === null || value === undefined) return EMPTY_PROFILE;

  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return EMPTY_PROFILE;
    }
  }
  if (typeof raw !== "object" || raw === null) return EMPTY_PROFILE;

  const input = raw as Partial<ProfileState>;
  const country = parseCountry(input.country);
  const services = Array.isArray(input.services)
    ? unique(
        input.services
          .filter((id) => typeof id === "number" && Number.isInteger(id))
          .slice(0, 100),
      )
    : [];
  const watched = Array.isArray(input.watched)
    ? unique(input.watched.filter((id) => typeof id === "string").slice(0, 500))
    : [];
  const want = Array.isArray(input.want)
    ? unique(input.want.filter((id) => typeof id === "string").slice(0, 500))
    : [];
  const saved = Array.isArray(input.saved)
    ? input.saved
        .filter(
          (filter): filter is SavedFilter =>
            !!filter &&
            typeof filter.id === "string" &&
            typeof filter.name === "string" &&
            typeof filter.query === "string",
        )
        .slice(0, 20)
    : [];

  return { country, services, watched, want, saved };
}

export function mergeProfiles(
  server: ProfileState,
  local: ProfileState,
): ProfileState {
  const services = unique([...server.services, ...local.services]).slice(
    0,
    100,
  );
  const watched = unique([...server.watched, ...local.watched]).slice(0, 500);
  const want = unique([...server.want, ...local.want])
    .filter((id) => !watched.includes(id))
    .slice(0, 500);
  const saved = [...server.saved, ...local.saved]
    .filter(
      (filter, index, all) =>
        all.findIndex(
          (item) => item.query === filter.query && item.name === filter.name,
        ) === index,
    )
    .slice(0, 20);

  return {
    country: local.country !== DEFAULT_COUNTRY ? local.country : server.country,
    services,
    watched,
    want,
    saved,
  };
}

export function isProfileEmpty(profile: ProfileState): boolean {
  return (
    profile.services.length === 0 &&
    profile.watched.length === 0 &&
    profile.want.length === 0 &&
    profile.saved.length === 0
  );
}
