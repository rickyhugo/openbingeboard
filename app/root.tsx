import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { AuthActions } from "~/components/auth-actions";
import { Brand } from "~/components/brand";
import { ProfileProvider } from "~/components/profile-provider";
import { buttonVariants } from "~/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { countryFromRequest } from "~/lib/country.server";
import { themeFromRequest } from "~/lib/theme.server";
import {
  auth,
  emailEnabled,
  emailVerificationRequired,
} from "~/server/auth.server";
import { cached } from "~/server/cache.server";
import { runQuery } from "~/server/effect.server";
import { listProviders } from "~/server/queries.server";

import type { Route } from "./+types/root";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const country = countryFromRequest(request);
  const [providersResult, sessionResult] = await Promise.allSettled([
    cached(`providers:${country}`, 5 * 60_000, () =>
      runQuery(listProviders(country)),
    ),
    auth.api.getSession({ headers: request.headers }),
  ]);

  if (providersResult.status === "rejected") {
    console.error("[root] provider query failed", providersResult.reason);
  }
  if (sessionResult.status === "rejected") {
    console.error("[root] session query failed", sessionResult.reason);
  }

  const providers =
    providersResult.status === "fulfilled" ? providersResult.value : [];
  const session =
    sessionResult.status === "fulfilled" ? sessionResult.value : null;

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      }
    : null;

  return {
    providers,
    country,
    theme: themeFromRequest(request),
    user,
    emailEnabled,
    emailVerificationRequired,
  };
}

function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-card/80 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <Brand className="md:hidden" wordmarkClassName="text-lg sm:text-xl" />
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <AuthActions />
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const providers = data?.providers ?? [];
  const country = data?.country ?? "SE";
  const theme = data?.theme ?? "light";
  const user = data?.user ?? null;
  const { pathname } = useLocation();
  const bare = pathname === "/login" || pathname === "/reset-password";

  // Applied before first paint. "system" follows the OS preference; the
  // class is re-applied live by the theme toggle.
  const themeScript =
    theme === "dark"
      ? "document.documentElement.classList.add('dark')"
      : theme === "system"
        ? "if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}"
        : "document.documentElement.classList.remove('dark')";

  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : ""}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ProfileProvider user={user} country={country}>
          {bare ? (
            <div id="main" className="min-h-dvh">
              {children}
            </div>
          ) : (
            <SidebarProvider>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-xs"
              >
                Skip to content
              </a>

              <AppSidebar providers={providers} theme={theme} />

              <div className="flex min-w-0 flex-1 flex-col bg-card md:peer-data-[variant=inset]:my-2 md:peer-data-[variant=inset]:mr-2 md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-sidebar-border md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2">
                <Header />

                <div id="main" className="min-h-[calc(100dvh-4rem)] flex-1">
                  {children}
                </div>
              </div>
            </SidebarProvider>
          )}
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
    <main className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-start justify-center px-4 py-16">
      <p className="eyebrow">{message}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{details}</h1>
      <Link
        to="/"
        className={"mt-5 " + buttonVariants({ variant: "outline", size: "sm" })}
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
