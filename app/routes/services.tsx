import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  PlayCircleIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { ProviderLogo } from "~/components/provider-logo";
import { countryName } from "~/lib/countries";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="eyebrow">Settings</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight">
          Your services
        </h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/60"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="mt-2 font-display text-5xl tracking-tight md:text-6xl">
            Your services
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Select the services you can watch. They filter the catalogue, shape
            your recommendations, and appear in the sidebar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/ask"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
            Ask
          </Link>
          <Link to={servicesQuery} className={buttonVariants({ size: "sm" })}>
            <HugeiconsIcon icon={PlayCircleIcon} strokeWidth={2} />
            Browse {selected.length > 0 ? "my services" : "catalogue"}
          </Link>
        </div>
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Selected</h2>
          <p className="text-[11px] text-muted-foreground">
            {selected.length} of {providers.length} selected
          </p>
        </div>

        {selected.length === 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-5">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <HugeiconsIcon
                icon={PlayCircleIcon}
                strokeWidth={1.8}
                className="size-5"
              />
            </span>
            <p className="text-sm text-muted-foreground">
              {state.services.length > 0
                ? `Your selected services are not available in ${countryName(data?.country ?? "SE")}.`
                : "None selected. Choose the services you can watch below."}
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_oklch(0_0_0/3%)]"
              >
                <ProviderLogo
                  path={provider.logoPath}
                  name={provider.name}
                  className="size-10 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {provider.name}
                  </p>
                  <Link
                    to={"/?providers=" + provider.id}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    Browse titles
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="size-3"
                    />
                  </Link>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${provider.name}`}
                  onClick={() => toggleService(provider.id)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">All services</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select everything you can watch. You can change this any time.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} of {alpha.length}
          </p>
        </div>

        <div className="relative mt-4 max-w-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services"
            aria-label="Search services"
            className="rounded-full pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
            No services match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => {
              const active = hasService(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleService(provider.id)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
                  <ProviderLogo
                    path={provider.logoPath}
                    name={provider.name}
                    className="size-10 rounded-lg"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {provider.name}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-transparent",
                    )}
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
