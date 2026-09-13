/**
 * Only let authentication flows navigate back into this app. This prevents a
 * `next` query parameter from turning a magic-link sign-in into an open
 * redirect.
 */
export function safeReturnPath(value: string | null | undefined, fallback = "/home"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  return value;
}
