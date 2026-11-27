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
        "inline-flex h-5 min-w-0 max-w-full items-center gap-1 overflow-hidden rounded-full border px-2 text-[10px] font-medium whitespace-nowrap",
        tone === "overlay"
          ? "border-white/15 bg-black/55 text-white backdrop-blur-md"
          : "border-border/80 bg-muted/70 text-muted-foreground",
        compact && "max-w-[9rem]",
        className,
      )}
      title={`${name} · ${MONETIZATION_LABEL[monetization] ?? monetization}`}
    >
      <span className="min-w-0 truncate">{name}</span>
      {!compact && (
        <>
          <span className="shrink-0 opacity-40">·</span>
          <span className="shrink-0 tracking-wide uppercase opacity-70">
            {MONETIZATION_LABEL[monetization] ?? monetization}
          </span>
        </>
      )}
    </span>
  );
}
