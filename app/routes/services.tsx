import { Link, useRouteLoaderData } from "react-router";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import type { loader as rootLoader } from "~/root";
import type { ProviderRow } from "~/server/queries.server";

export function meta() {
  return [{ title: "Your services · OpenBingeBoard" }];
}

export default function Services() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const providers = data?.providers ?? [];
  const { state, hydrated, hasService, toggleService } = useProfile();
  const selected = state.services
    .map((id) => providers.find((provider) => provider.id === id))
    .filter((provider): provider is ProviderRow => provider !== undefined);
  const servicesQuery =
    state.services.length > 0 ? "/?providers=" + state.services.join(",") : "/";

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
            Pick the services you can use. They become quick filters in the
            sidebar and limit the catalogue to what you can actually watch.
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
          {selected.length > 0 ? (
            <Link
              to={servicesQuery}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Browse all selected
            </Link>
          ) : null}
        </div>

        {selected.length === 0 ? (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            No services selected yet. Choose the ones you use below.
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
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {provider.name}
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
          Check every service you can watch. Guest selections stay in this
          browser; signed-in selections sync with your profile.
        </p>
        <div className="mt-3 grid gap-x-6 gap-y-1 border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <label
              key={provider.id}
              className="flex items-center justify-between gap-3 py-1.5 text-xs"
            >
              <span className="truncate">{provider.name}</span>
              <input
                type="checkbox"
                className="size-3.5 accent-foreground"
                checked={hasService(provider.id)}
                onChange={() => toggleService(provider.id)}
                aria-label={provider.name}
              />
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
