import { ATTRIBUTION } from "~/lib/tmdb";

export function meta() {
  return [{ title: "About · OpenBingeBoard" }];
}

const linkClass = "underline underline-offset-4 hover:text-foreground";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        About
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        OpenBingeBoard
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        A non-commercial catalogue of films and series available to stream in
        Sweden. Browse without an account, or sign in to keep a watchlist,
        choose your services, and save views.
      </p>

      <section className="mt-10 border-t pt-6">
        <h2 className="text-sm font-semibold tracking-tight">
          Data and attribution
        </h2>
        <div className="mt-3 max-w-2xl space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Title metadata and Swedish availability come from{" "}
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
            through TMDB. Provider links open the streaming service where one is
            available.
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

      <section className="mt-8 border-t pt-6">
        <h2 className="text-sm font-semibold tracking-tight">Licensing</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          OpenBingeBoard is a personal, non-commercial project. This product
          uses the TMDB API but is not endorsed or certified by TMDB or
          JustWatch. All titles, artwork, and ratings belong to their respective
          owners.
        </p>
      </section>
    </main>
  );
}
