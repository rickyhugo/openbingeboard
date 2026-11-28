import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  PlayCircleIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { ProviderLogo } from "~/components/provider-logo";
import { Breadcrumbs } from "~/components/breadcrumbs";
import { useProfile } from "~/components/profile-provider";
import { buttonVariants } from "~/components/ui/button";
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
        <h1 className="text-xl font-semibold tracking-tight">Your services</h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse border border-border bg-muted/60"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <Breadcrumbs
        items={[
          { label: "My profile", to: "/profile" },
          { label: "Your services" },
        ]}
      />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">All services</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select everything you can watch. You can change this any time.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selected.length} of {alpha.length} selected
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
            className=" pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
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
                    "group flex items-center gap-3 border p-3 text-left transition-all",
                    active
                      ? "border-foreground/40 bg-muted"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
                  <ProviderLogo
                    path={provider.logoPath}
                    name={provider.name}
                    className="size-10"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {provider.name}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center border transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
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
