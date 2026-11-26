export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";

export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
