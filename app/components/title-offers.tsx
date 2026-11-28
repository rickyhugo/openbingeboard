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
  const selected = new Set(state.services);
  const hasSelected = hydrated && selected.size > 0;

  const ordered = [...offers].sort(
    (a, b) =>
      Number(selected.has(b.providerId)) - Number(selected.has(a.providerId)),
  );

  return (
    <div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFER_GROUPS.map((group) => {
          const groupOffers = ordered.filter(
            (offer) => offer.monetization === group.key,
          );
          if (groupOffers.length === 0) return null;

          return (
            <div key={group.key} className="border">
              <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                {group.label}
              </div>
              <ul>
                {groupOffers.map((offer) => {
                  const inServices = selected.has(offer.providerId);
                  const dim = hasSelected && !inServices;

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
                            "shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline",
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
