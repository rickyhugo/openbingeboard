export const COUNTRIES = [
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IS", name: "Iceland" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const DEFAULT_COUNTRY: CountryCode = "SE";
export const COUNTRY_COOKIE = "obb_country";

export function parseCountry(value: unknown): CountryCode {
  return typeof value === "string" &&
    COUNTRIES.some((country) => country.code === value)
    ? (value as CountryCode)
    : DEFAULT_COUNTRY;
}

export function countryName(code: CountryCode): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? "Sweden";
}

export function writeCountryCookie(code: CountryCode): void {
  if (typeof document === "undefined") return;
  document.cookie =
    COUNTRY_COOKIE +
    "=" +
    code +
    "; path=/; max-age=31536000; SameSite=Lax" +
    (window.location.protocol === "https:" ? "; Secure" : "");
}
