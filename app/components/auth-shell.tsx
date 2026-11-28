import type { ReactNode } from "react";
import { Brand } from "~/components/brand";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border/70 p-10 lg:flex xl:p-14">
        <Brand />
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your library, services, and saved views.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Synced across devices when you sign in.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
