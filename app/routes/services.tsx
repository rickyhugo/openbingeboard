import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { ProviderLogo } from "~/components/provider-logo";
import { countryName } from "~/lib/countries";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { ProviderRow } from "~/server/queries.server";
import type { loader as rootLoader } from "~/root";

export function meta() {
  return [{ title: "Your services · OpenBingeBoard" }];
}

export default function Services() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const providers = data?.providers ?? [];
  const { state, hydrated, hasService, toggleService } = useProfile();
  const [query, setQuery] = useState("");
  const alpha = [...providers].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const selected = alpha.filter((provider) =>
    state.services.includes(provider.id),
  );
  const needle = query.trim().toLocaleLowerCase();
  const filtered = alpha.filter((provider) =>
    provider.name.toLocaleLowerCase().includes(needle),
  );
  const servicesQuery =
    selected.length > 0
      ? "/?providers=" + selected.map((provider) => provider.id).join(",")
      : "/";

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Your services</h1>
        <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Your services
          </h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Select the services you can watch. They filter the catalogue and
            appear in the sidebar.
          </p>
        </div>
        <Link
          to={servicesQuery}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Browse {selected.length > 0 ? "my services" : "catalogue"}
        </Link>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Selected</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected.length} of {providers.length} services selected.
            </p>
          </div>
        </div>

        {selected.length === 0 ? (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            {state.services.length > 0
              ? `Your selected services are not available in ${countryName(data?.country ?? "SE")}.`
              : "None selected. Choose services below."}
          </p>
        ) : (
          <ul className="mt-3 divide-y border">
            {selected.map((provider) => (
              <li
                key={provider.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <Link
                  to={"/?providers=" + provider.id}
                  className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:underline"
                >
                  <ProviderLogo path={provider.logoPath} name={provider.name} />
                  <span className="truncate">{provider.name}</span>
                </Link>
                <Link
                  to={"/?providers=" + provider.id}
                  className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:underline"
                >
                  Browse
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleService(provider.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">All services</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Select everything you can watch.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services"
            aria-label="Search services"
            className="h-8 w-full sm:max-w-xs"
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {filtered.length} of {alpha.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            No services match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          <div className="mt-3 grid gap-x-6 gap-y-1 border p-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => (
              <label
                key={provider.id}
                className="flex cursor-pointer items-center gap-2 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  className="size-3.5 shrink-0 accent-foreground"
                  checked={hasService(provider.id)}
                  onChange={() => toggleService(provider.id)}
                  aria-label={provider.name}
                />
                <ProviderLogo
                  path={provider.logoPath}
                  name={provider.name}
                  className="h-7 w-7"
                />
                <span className="min-w-0 truncate">{provider.name}</span>
              </label>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
