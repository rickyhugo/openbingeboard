import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

export function HeaderSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const current = location.pathname === "/" ? (params.get("q") ?? "") : "";
  const [query, setQuery] = useState(current);

  useEffect(() => {
    setQuery(current);
  }, [current]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? "/?q=" + encodeURIComponent(value) : "/");
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="relative hidden w-full max-w-sm md:block"
    >
      <HugeiconsIcon
        icon={Search01Icon}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search films and series"
        aria-label="Search films and series"
        className="h-9 w-full rounded-full border border-border bg-card/60 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
      />
    </form>
  );
}
