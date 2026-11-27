import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Brand } from "~/components/brand";

const FEATURES = [
  "Pick up where you left off",
  "Keep your services in sync",
  "Save the filters you actually use",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="page-glow relative hidden flex-col justify-between overflow-hidden border-r border-border/70 p-10 lg:flex xl:p-14">
        <Brand />
        <div className="max-w-lg">
          <p className="eyebrow">One account, every device</p>
          <h1 className="mt-4 font-display text-6xl leading-[0.92] tracking-[-0.02em] xl:text-7xl">
            Keep your watchlist{" "}
            <span className="text-primary italic">in sync</span>.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
            Your services, watchlist, and saved views follow you from the sofa
            to the phone.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4 text-primary"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-muted-foreground">
          OpenBingeBoard · Nordic streaming guide
        </p>
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
