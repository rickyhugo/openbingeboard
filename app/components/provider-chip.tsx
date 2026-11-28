import { cn } from "cn";

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
  tone = "default",
  className,
}: {
  name: string;
  monetization: string;
  compact?: boolean;
  tone?: "default" | "overlay";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-0 max-w-full items-center gap-1 overflow-hidden border px-1.5 font-mono text-[10px] whitespace-nowrap",
        tone === "overlay"
          ? "border-white/20 bg-black/80 text-white"
          : "border-border bg-muted text-muted-foreground",
        compact && "max-w-[9rem]",
        className,
      )}
      title={`${name} · ${MONETIZATION_LABEL[monetization] ?? monetization}`}
    >
      <span className="min-w-0 truncate">{name}</span>
      {!compact && (
        <>
          <span className="shrink-0 opacity-50">/</span>
          <span className="shrink-0 uppercase tracking-wide opacity-80">
            {MONETIZATION_LABEL[monetization] ?? monetization}
          </span>
        </>
      )}
    </span>
  );
}
