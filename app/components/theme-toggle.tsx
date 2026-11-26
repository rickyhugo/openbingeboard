import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
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
      <HugeiconsIcon
        icon={theme === "dark" ? Sun03Icon : Moon02Icon}
        strokeWidth={2}
      />
    </Button>
  );
}
