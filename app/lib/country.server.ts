import { COUNTRY_COOKIE, parseCountry, type CountryCode } from "./countries";

export function countryFromRequest(request: Request): CountryCode {
  const cookie = request.headers.get("Cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COUNTRY_COOKIE) {
      try {
        return parseCountry(decodeURIComponent(rest.join("=")));
      } catch {
        return parseCountry(undefined);
      }
    }
  }
  return parseCountry(undefined);
}
