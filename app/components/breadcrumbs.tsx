import { Link } from "react-router";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 ? <span className="opacity-40">/</span> : null}
            {item.to && !last ? (
              <Link
                to={item.to}
                className="transition-colors hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
