export type Theme = "light" | "dark" | "system";

export const THEME_COOKIE = "theme";

export function parseTheme(value: string | null | undefined): Theme {
  if (value === "dark" || value === "light" || value === "system") {
    return value;
  }
  return "light";
}
