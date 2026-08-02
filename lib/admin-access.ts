export const ADMIN_ACCESS_COOKIE = "beer_scramble_admin";

export function getAdminAccessCode(): string {
  return process.env.ADMIN_ACCESS_CODE?.trim() ?? "";
}

export function isAdminAccessEnabled(): boolean {
  return getAdminAccessCode().length > 0;
}

export function sanitizeAdminRedirect(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/tournament";
  }

  return nextPath;
}

export async function hashAdminAccessCode(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
