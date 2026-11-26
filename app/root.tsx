import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Badge } from "~/components/ui/badge";
import { ATTRIBUTION } from "~/lib/tmdb";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-xs"
        >
          Skip to content
        </a>

        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link to="/" className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold tracking-tight uppercase">
                OpenBingeBoard
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                SE
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
                Sweden / nightly data
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[9px] uppercase tracking-widest"
              >
                Beta
              </Badge>
            </div>
          </div>
        </header>

        <div id="main" className="flex-1">
          {children}
        </div>

        <footer className="mt-16 border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl">
              Metadata and availability from{" "}
              <a
                href={ATTRIBUTION.tmdb}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                TMDB
              </a>
              . Streaming data powered by{" "}
              <a
                href={ATTRIBUTION.justWatch}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                JustWatch
              </a>
              . Ratings via{" "}
              <a
                href={ATTRIBUTION.omdb}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                OMDb
              </a>
              .
            </p>
          </div>
        </footer>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {message}
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{details}</h1>
      <Link
        to="/"
        className="mt-4 inline-block font-mono text-[10px] uppercase tracking-wider underline underline-offset-4"
      >
        Back to the catalogue
      </Link>
      {stack && (
        <pre className="mt-6 w-full overflow-x-auto border p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
