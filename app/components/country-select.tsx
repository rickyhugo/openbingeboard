import { useMemo, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import {
  CaretDown,
  Check,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useProfile } from "~/components/profile-provider";
import { COUNTRIES, parseCountry } from "~/lib/countries";
import type { loader as rootLoader } from "~/root";

export function CountrySelect() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const revalidator = useRevalidator();
  const { state, hydrated, setCountry } = useProfile();
  const value = hydrated ? state.country : (data?.country ?? "SE");
  const pending = revalidator.state === "loading";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];
  const needle = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () =>
      COUNTRIES.filter(
        (country) =>
          country.name.toLocaleLowerCase().includes(needle) ||
          country.code.toLocaleLowerCase().includes(needle),
      ),
    [needle],
  );

  function pick(code: string) {
    setCountry(parseCountry(code));
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        type="button"
        disabled={pending}
        aria-label="Region"
        aria-busy={pending}
        title="Change region"
        className="flex h-7 w-full items-center gap-2 border border-sidebar-border bg-card/60 px-2 text-left text-xs transition-colors hover:bg-muted/60 disabled:opacity-60"
      >
        <span className="font-mono text-[10px] text-muted-foreground">
          {current.code}
        </span>
        <span className="min-w-0 flex-1 truncate">{current.name}</span>
        <CaretDown
          weight="bold"
          className="size-3 shrink-0 text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search region"
          aria-label="Search region"
          autoFocus
          className="h-7"
        />
        <div
          role="radiogroup"
          aria-label="Countries"
          className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto"
        >
          {filtered.map((country) => {
            const active = value === country.code;
            return (
              <button
                key={country.code}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => pick(country.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-none px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                  active && "bg-muted font-medium",
                )}
              >
                <span className="w-6 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {country.code}
                </span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                {active ? (
                  <Check weight="bold" className="size-3.5 text-foreground" />
                ) : null}
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No region matches “{query.trim()}”.
            </p>
          ) : null}
        </div>
        {pending ? (
          <p
            aria-live="polite"
            className="px-2 pt-1.5 text-[10px] text-muted-foreground"
          >
            Updating…
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
