import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { ATTRIBUTION } from "~/lib/tmdb";

export function meta() {
  return [{ title: "About · OpenBingeBoard" }];
}

const linkClass =
  "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary";

const steps = [
  {
    title: "Pick your region",
    body: "Availability differs by country. Choose yours once and the catalogue follows.",
  },
  {
    title: "Choose your services",
    body: "The catalogue narrows to the services you can actually use, with rental and purchase options called out.",
  },
  {
    title: "Keep what you like",
    body: "A watchlist, watched titles, and saved filters stay with you across devices.",
  },
];

export default function About() {
  return (
    <main>
      <section className="page-glow border-b border-border/70">
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-12 md:pt-20 md:pb-16">
          <p className="eyebrow">About</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-7xl">
            A calmer way to decide what to watch.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            OpenBingeBoard is a non-commercial catalogue of films and series
            available across the Nordic countries. Pick your country, choose
            your services, and see every option in one place, without opening
            five different apps.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-12">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <span className="font-display text-3xl leading-none text-primary/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-4 text-sm font-semibold">{step.title}</h2>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl tracking-tight">
              Data and attribution
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>
                Title metadata and Nordic availability come from{" "}
                <a
                  href={ATTRIBUTION.tmdb}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  TMDB
                </a>
                . Streaming availability is sourced from{" "}
                <a
                  href={ATTRIBUTION.justWatch}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  JustWatch
                </a>{" "}
                through TMDB. Provider links open the streaming service where
                one is available.
              </p>
              <p>
                IMDb ratings come from the IMDb bulk ratings dataset. Rotten
                Tomatoes and Metacritic scores come from{" "}
                <a
                  href={ATTRIBUTION.omdb}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  OMDb
                </a>
                .
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl tracking-tight">Licensing</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              OpenBingeBoard is a personal, non-commercial project. This product
              uses the TMDB API but is not endorsed or certified by TMDB or
              JustWatch. All titles, artwork, and ratings belong to their
              respective owners.
            </p>
            <a
              href="https://github.com/rickyhugo/openbingeboard"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View the source on GitHub
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                className="size-3"
              />
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
