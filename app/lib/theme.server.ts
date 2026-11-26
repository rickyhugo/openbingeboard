import { parseTheme, THEME_COOKIE, type Theme } from "./theme";

export function themeFromRequest(request: Request): Theme {
  const cookie = request.headers.get("Cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === THEME_COOKIE) return parseTheme(rest.join("="));
  }
  return "light";
}
