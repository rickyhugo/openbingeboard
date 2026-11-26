import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { ProfileProvider } from "~/components/profile-provider";
import { ThemeToggle } from "~/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { ATTRIBUTION } from "~/lib/tmdb";
import { themeFromRequest } from "~/lib/theme.server";
import { auth } from "~/server/auth.server";
import { runQuery } from "~/server/effect.server";
import { listProviders } from "~/server/queries.server";

import type { Route } from "./+types/root";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const [providers, session] = await Promise.all([
    runQuery(listProviders),
    auth.api.getSession({ headers: request.headers }),
  ]);

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }
    : null;

  return { providers, theme: themeFromRequest(request), user };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { providers, theme, user } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className={theme === "dark" ? "dark" : ""}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ProfileProvider user={user}>
          <SidebarProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-xs"
            >
              Skip to content
            </a>

            <AppSidebar providers={providers} />

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
                <SidebarTrigger />
                <Link to="/" className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    OpenBingeBoard
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    SE
                  </span>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                  <ThemeToggle initial={theme} />
                </div>
              </header>

              <div id="main" className="flex-1">
                {children}
              </div>

              <footer className="mt-16 border-t">
                <div className="mx-auto max-w-6xl px-4 py-8 text-[11px] text-muted-foreground">
                  <p className="max-w-2xl">
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
            </div>
          </SidebarProvider>
        </ProfileProvider>

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
      <h2 className="mt-2 text-2xl font-semibold">{details}</h2>
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
