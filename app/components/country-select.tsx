import { useRouteLoaderData } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { COUNTRIES, parseCountry } from "~/lib/countries";
import type { loader as rootLoader } from "~/root";

export function CountrySelect() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const { state, hydrated, setCountry } = useProfile();
  const value = hydrated ? state.country : (data?.country ?? "SE");

  return (
    <select
      value={value}
      onChange={(event) => setCountry(parseCountry(event.target.value))}
      aria-label="Country"
      className="h-8 w-full border bg-background px-2 font-mono text-[11px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
