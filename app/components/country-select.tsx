import { useRevalidator, useRouteLoaderData } from "react-router";
import { useProfile } from "~/components/profile-provider";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
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
      <NativeSelect
        value={value}
        onChange={(event) => setCountry(parseCountry(event.target.value))}
        aria-label="Country"
        aria-busy={pending}
        disabled={pending}
        className="w-full"
      >
        {COUNTRIES.map((country) => (
          <NativeSelectOption key={country.code} value={country.code}>
            {country.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <p
        className="mt-1 h-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"
        aria-live="polite"
      >
        {pending ? "Updating..." : ""}
      </p>
    </div>
  );
}
