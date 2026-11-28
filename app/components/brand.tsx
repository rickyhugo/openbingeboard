import { Link } from "react-router";
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
        "flex min-w-0 items-center focus-visible:outline-none",
        className,
      )}
    >
      <span
        className={cn(
          "truncate text-base font-semibold tracking-tight",
          wordmarkClassName,
        )}
      >
        OpenBingeBoard
      </span>
    </Link>
  );
}
