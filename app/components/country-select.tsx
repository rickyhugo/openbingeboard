import { useRevalidator, useRouteLoaderData } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { COUNTRIES, parseCountry } from "~/lib/countries";
import type { loader as rootLoader } from "~/root";

export function CountrySelect() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const revalidator = useRevalidator();
  const { state, hydrated, setCountry } = useProfile();
  const value = hydrated ? state.country : (data?.country ?? "SE");
  const pending = revalidator.state === "loading";

  return (
    <div>
      <select
        value={value}
        onChange={(event) => setCountry(parseCountry(event.target.value))}
        aria-label="Country"
        aria-busy={pending}
        disabled={pending}
        className="h-8 w-full border bg-background px-2 font-mono text-[11px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      <p
        className="mt-1 h-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"
        aria-live="polite"
      >
        {pending ? "Updating..." : ""}
      </p>
    </div>
  );
}
