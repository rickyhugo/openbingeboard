import {
  Link,
  redirect,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  Globe02Icon,
  PlayCircleIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { AccountPanel } from "~/components/account-panel";
import { useProfile } from "~/components/profile-provider";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button, buttonVariants } from "~/components/ui/button";
import { COUNTRIES, countryName } from "~/lib/countries";
import { cn } from "cn";
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

const quickLinks = [
  { label: "Watched", to: "/library/watched", icon: CheckmarkCircle02Icon },
  { label: "Want to watch", to: "/library/want", icon: Bookmark02Icon },
  { label: "Your services", to: "/services", icon: PlayCircleIcon },
  { label: "Ask the catalogue", to: "/ask", icon: SparklesIcon },
];

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
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="eyebrow">Your account</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight">
          My profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <section className="page-glow border-b border-border/70">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 md:pt-12">
          <p className="eyebrow">Your account</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-5xl tracking-tight md:text-6xl">
                My profile
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {profile.user
                  ? profile.user.email
                  : "Guest profile. Your lists stay in this browser until you sign in."}
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
              {!profile.user ? (
                <Link to="/login" className={buttonVariants({ size: "sm" })}>
                  Sign in to sync
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="group">
              <div className="rounded-xl border border-border bg-card p-4 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.03]">
                <p className="eyebrow">{stat.label}</p>
                <p className="mt-1 font-display text-4xl leading-none tracking-tight">
                  {stat.value}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-12">
            {!profile.user ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-card/40 p-5">
                <div>
                  <p className="text-sm font-semibold">
                    You are browsing as a guest.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sign in to sync your library, services, and saved views.
                  </p>
                </div>
                <Link to="/login" className={buttonVariants({ size: "sm" })}>
                  Sign in
                </Link>
              </div>
            ) : null}

            {profile.user ? <AccountPanel /> : null}

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Country</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Controls availability, services, and links.
                    {countryPending ? " Updating..." : ""}
                  </p>
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label="Country"
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
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
                      className={cn(
                        "relative flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-wait disabled:opacity-60",
                        active
                          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                          : "border-border bg-card hover:border-foreground/20 hover:bg-muted/40",
                      )}
                    >
                      <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                        {country.code}
                      </span>
                      <span className="text-xs font-medium">
                        {country.name}
                      </span>
                      {active ? (
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          strokeWidth={2}
                          className="absolute top-2.5 right-2.5 size-4 text-primary"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
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
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Browse my services
                  </Link>
                  <Link
                    to="/services"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Manage
                  </Link>
                </div>
              </div>

              {selected.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.map((provider) => (
                    <Link
                      key={provider.id}
                      to={"/?providers=" + provider.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <span className="size-1.5 rounded-full bg-primary" />
                      {provider.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
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

            <section id="saved">
              <h2 className="text-sm font-semibold">Saved views</h2>
              {state.saved.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
                  No saved views yet. Apply filters in the catalogue, then
                  choose Save.
                </p>
              ) : (
                <ul className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                  {state.saved.map((filter) => (
                    <li
                      key={filter.id}
                      className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
                    >
                      <Link
                        to={"/" + filter.query}
                        className="min-w-0 flex-1 text-xs font-medium hover:text-primary"
                      >
                        {filter.name}
                      </Link>
                      <span className="hidden max-w-[45%] truncate text-[10px] text-muted-foreground sm:block">
                        {filter.query || "/"}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => profile.removeFilter(filter.id)}
                      >
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Quick links</h2>
              <div className="mt-3 space-y-0.5">
                {quickLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                    {item.label}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="ml-auto size-3 opacity-40"
                    />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Appearance</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Light or dark.
                  </p>
                </div>
                <ThemeToggle initial={data?.theme ?? "light"} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon
                  icon={Globe02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                <h2 className="text-sm font-semibold text-foreground">
                  Your data
                </h2>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {profile.user
                  ? "Your library, services, and saved views sync with your account."
                  : "Guest lists stay in this browser. Sign in to sync them across devices."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
