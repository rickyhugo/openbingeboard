import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import type { Theme } from "~/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function applyTheme(next: Theme) {
  const dark =
    next === "dark" ||
    (next === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function pick(next: Theme) {
    setTheme(next);
    document.cookie =
      "theme=" + next + "; path=/; max-age=31536000; SameSite=Lax";
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center border border-sidebar-border p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          title={option.label}
          aria-label={option.label + " theme"}
          onClick={() => pick(option.value)}
          className={cn(
            "grid size-6 place-items-center transition-colors",
            theme === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <option.icon weight="bold" className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
