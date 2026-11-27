import {
  Link,
  redirect,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { AccountPanel } from "~/components/account-panel";
import { useProfile } from "~/components/profile-provider";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { COUNTRIES, countryName } from "~/lib/countries";
import type { loader as rootLoader } from "~/root";
import type { Route } from "./+types/profile";

export async function loader({ request }: Route.LoaderArgs) {
  const tab = new URL(request.url).searchParams.get("tab");
  if (tab === "watched" || tab === "want") {
    throw redirect("/library/" + tab);
  }
  return null;
}

export function meta() {
  return [{ title: "My profile · OpenBingeBoard" }];
}

export default function Profile() {
  const profile = useProfile();
  const revalidator = useRevalidator();
  const countryPending = revalidator.state === "loading";
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const providers = data?.providers ?? [];
  const { state } = profile;
  const selected = state.services
    .map((id) => providers.find((provider) => provider.id === id))
    .filter(
      (provider): provider is (typeof providers)[number] =>
        provider !== undefined,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const servicesQuery =
    selected.length > 0
      ? "/?providers=" + selected.map((provider) => provider.id).join(",")
      : "/";

  const stats = [
    { label: "Watched", value: state.watched.length, to: "/library/watched" },
    {
      label: "Want to watch",
      value: state.want.length,
      to: "/library/want",
    },
    { label: "Services", value: state.services.length, to: "/services" },
    { label: "Saved views", value: state.saved.length, to: "#saved" },
  ];

  if (!profile.hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">My profile</h1>
        <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My profile</h1>
        </div>
      </div>

      {!profile.user ? (
        <p className="mt-3 border border-dashed p-3 text-xs text-muted-foreground">
          Guest profile. Lists stay in this browser.{" "}
          <Link
            to="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Sign in to sync
          </Link>
          .
        </p>
      ) : null}

      {profile.user ? <AccountPanel /> : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="block focus-visible:outline-none"
          >
            <Card
              size="sm"
              className="h-full transition-colors hover:bg-muted/40"
            >
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Country</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Controls availability, services, and links.
          {countryPending ? " Updating..." : ""}
        </p>
        <div
          role="radiogroup"
          aria-label="Country"
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {COUNTRIES.map((country) => {
            const active = state.country === country.code;
            return (
              <button
                key={country.code}
                type="button"
                role="radio"
                aria-checked={active}
                aria-busy={countryPending}
                disabled={countryPending}
                onClick={() => profile.setCountry(country.code)}
                className={
                  "flex flex-col items-start gap-1 border p-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 " +
                  (active ? "border-foreground bg-muted" : "hover:bg-muted/40")
                }
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {country.code}
                </span>
                <span className="text-xs font-medium">{country.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Your services</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected.length > 0
                ? selected.length + " selected."
                : "Choose the services you can use."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={servicesQuery}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Browse my services
            </Link>
            <Link
              to="/services"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Manage services
            </Link>
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {selected.map((provider) => (
              <Link
                key={provider.id}
                to={"/?providers=" + provider.id}
                className="inline-flex h-6 items-center border bg-muted px-2 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                {provider.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            {state.services.length > 0
              ? `Your selected services are not available in ${countryName(data?.country ?? "SE")}.`
              : "No services selected."}{" "}
            <Link
              to="/services"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Manage services
            </Link>
            .
          </p>
        )}
      </section>

      <Separator className="my-8" />

      <section id="saved">
        <h2 className="text-sm font-semibold">Saved views</h2>
        {state.saved.length === 0 ? (
          <p className="mt-3 border border-dashed p-4 text-xs text-muted-foreground">
            No saved views yet. Apply filters in the catalogue, then choose Save
            view.
          </p>
        ) : (
          <ul className="mt-3 divide-y border">
            {state.saved.map((filter) => (
              <li
                key={filter.id}
                className="flex items-center justify-between gap-3 p-2"
              >
                <Link
                  to={"/" + filter.query}
                  className="min-w-0 flex-1 text-xs font-medium hover:underline"
                >
                  {filter.name}
                </Link>
                <span className="hidden max-w-[45%] truncate font-mono text-[10px] text-muted-foreground sm:block">
                  {filter.query || "/"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => profile.removeFilter(filter.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
