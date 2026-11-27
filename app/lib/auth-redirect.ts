export function safeNext(
  value: string | null | undefined,
  fallback = "/profile",
): string {
  if (!value) return fallback;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  if (value.startsWith("/login") || value.startsWith("/reset-password")) {
    return fallback;
  }
  return value;
}
