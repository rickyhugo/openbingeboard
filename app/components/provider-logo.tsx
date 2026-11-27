import { cn } from "cn";
import { providerLogoUrl } from "~/lib/tmdb";

export function ProviderLogo({
  path,
  name,
  className,
}: {
  path: string | null;
  name: string;
  className?: string;
}) {
  const url = providerLogoUrl(path);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-white",
        className ?? "h-6 w-6",
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <span className="font-mono text-[9px] font-bold text-black">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
