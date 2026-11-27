import { useRouteLoaderData } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { ProviderLogo } from "~/components/provider-logo";
import { useProfile } from "~/components/profile-provider";
import { buttonVariants } from "~/components/ui/button";
import type { OfferRow } from "~/server/queries.server";
import type { loader as rootLoader } from "~/root";

const OFFER_GROUPS = [
  { key: "flatrate", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "ads", label: "Free with ads" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
] as const;

export function TitleOffers({ offers }: { offers: readonly OfferRow[] }) {
  const { state, hydrated } = useProfile();
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const selected = new Set(state.services);
  const hasSelected = hydrated && selected.size > 0;

  const ordered = [...offers].sort(
    (a, b) =>
      Number(selected.has(b.providerId)) - Number(selected.has(a.providerId)),
  );

  const logoFor = (providerId: number) =>
    root?.providers.find((provider) => provider.id === providerId)?.logoPath ??
    null;

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {OFFER_GROUPS.map((group) => {
        const groupOffers = ordered.filter(
          (offer) => offer.monetization === group.key,
        );
        if (groupOffers.length === 0) return null;

        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_oklch(0_0_0/3%)]"
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <span className="text-[10px] text-muted-foreground">
                {groupOffers.length}
              </span>
            </div>
            <ul>
              {groupOffers.map((offer) => {
                const inServices = selected.has(offer.providerId);
                const dim = hasSelected && !inServices;

                return (
                  <li
                    key={`${offer.providerId}-${offer.monetization}`}
                    className={cn(
                      "flex min-w-0 items-center gap-3 border-b border-border/60 px-3.5 py-3 last:border-b-0",
                      dim && "opacity-55",
                    )}
                  >
                    <ProviderLogo
                      path={logoFor(offer.providerId)}
                      name={offer.providerName}
                      className="size-8 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                        <span className="truncate">{offer.providerName}</span>
                        {inServices ? (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-primary"
                            title="In your services"
                          />
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {inServices
                          ? "In your services"
                          : dim
                            ? "Not in your services"
                            : group.label}
                      </p>
                    </div>
                    {offer.link ? (
                      <a
                        href={offer.link}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({
                          variant: "ghost",
                          size: "xs",
                        })}
                      >
                        Open
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          strokeWidth={2}
                        />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
