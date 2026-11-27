import { useState } from "react";
import { cn } from "cn";
import { ProviderChip } from "~/components/provider-chip";
import { useProfile } from "~/components/profile-provider";
import type { OfferRow } from "~/server/queries.server";

const OFFER_GROUPS = [
  { key: "flatrate", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "ads", label: "Free with ads" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
] as const;

export function TitleOffers({ offers }: { offers: readonly OfferRow[] }) {
  const { state, hydrated } = useProfile();
  const [showAll, setShowAll] = useState(false);

  const selected = new Set(state.services);
  const hasSelected = hydrated && selected.size > 0;
  const selectedOffers = offers.filter((offer) =>
    selected.has(offer.providerId),
  );
  const selectedCount = selectedOffers.length;
  const otherCount = offers.length - selectedCount;
  const showingAll = !hasSelected || showAll || selectedCount === 0;
  const visible = showingAll ? offers : selectedOffers;

  const ordered = [...visible].sort(
    (a, b) =>
      Number(selected.has(b.providerId)) - Number(selected.has(a.providerId)),
  );

  return (
    <div>
      {hasSelected ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-dashed px-3 py-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          <span>{showingAll ? "All services" : "Your services"}</span>
          {otherCount > 0 && selectedCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {showAll
                ? "Only my services"
                : `Show all offers (+${otherCount})`}
            </button>
          ) : null}
        </div>
      ) : null}

      {hasSelected && selectedCount === 0 ? (
        <p className="mt-2 border border-dashed p-3 text-[11px] text-muted-foreground">
          None of your selected services carry this title. Showing all services.
        </p>
      ) : null}

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFER_GROUPS.map((group) => {
          const groupOffers = ordered.filter(
            (offer) => offer.monetization === group.key,
          );
          if (groupOffers.length === 0) return null;

          return (
            <div key={group.key} className="border">
              <div className="border-b bg-muted/50 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                {group.label}
              </div>
              <ul>
                {groupOffers.map((offer) => {
                  const inServices = selected.has(offer.providerId);
                  const dim = showingAll && hasSelected && !inServices;

                  return (
                    <li
                      key={`${offer.providerId}-${offer.monetization}`}
                      className={cn(
                        "flex min-w-0 items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0",
                        dim && "bg-muted/20",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <ProviderChip
                          name={offer.providerName}
                          monetization={offer.monetization}
                          className={dim ? "opacity-60" : undefined}
                        />
                        {dim ? (
                          <p className="mt-1 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                            Not in your services
                          </p>
                        ) : null}
                      </div>
                      {offer.link ? (
                        <a
                          href={offer.link}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "shrink-0 font-mono text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground hover:underline",
                            dim && "opacity-60",
                          )}
                        >
                          Open
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
    </div>
  );
}
