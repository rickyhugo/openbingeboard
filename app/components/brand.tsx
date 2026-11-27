import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { cn } from "cn";

export function Brand({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "group flex min-w-0 items-center gap-2.5 focus-visible:outline-none",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:-rotate-6">
        <HugeiconsIcon
          icon={PlayIcon}
          strokeWidth={2}
          className="size-4 translate-x-px"
        />
      </span>
      <span
        className={cn(
          "truncate font-display text-[23px] leading-none tracking-tight",
          wordmarkClassName,
        )}
      >
        OpenBingeBoard
      </span>
    </Link>
  );
}
