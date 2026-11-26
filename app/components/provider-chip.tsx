import { cn } from "cn";

const PROVIDER_TONES: Record<string, string> = {
  Netflix: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
  Viaplay:
    "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-400",
  "Amazon Prime Video":
    "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400",
  "Apple TV": "border-border bg-muted text-foreground",
  "SF Anytime":
    "border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400",
  "Google Play Movies":
    "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  "Disney+":
    "border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400",
};

const MONETIZATION_LABEL: Record<string, string> = {
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
  ads: "Free with ads",
  free: "Free",
};

export function ProviderChip({
  name,
  monetization,
  compact = false,
  className,
}: {
  name: string;
  monetization: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 border px-1.5 font-mono text-[10px] whitespace-nowrap",
        PROVIDER_TONES[name] ?? "border-border bg-muted text-muted-foreground",
        compact && "max-w-[9rem]",
        className,
      )}
      title={`${name} · ${MONETIZATION_LABEL[monetization] ?? monetization}`}
    >
      <span className="truncate">{name}</span>
      {!compact && (
        <>
          <span className="opacity-50">/</span>
          <span className="uppercase tracking-wide opacity-80">
            {MONETIZATION_LABEL[monetization] ?? monetization}
          </span>
        </>
      )}
    </span>
  );
}
