import { useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { Button } from "~/components/ui/button";
import type { Theme } from "~/lib/theme";

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.cookie =
      "theme=" + next + "; path=/; max-age=31536000; SameSite=Lax";
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun weight="bold" /> : <Moon weight="bold" />}
    </Button>
  );
}
