import { getSupabaseClient } from "@/lib/supabaseClient";

export const USER_COOKIE_NAME = "cp_uid";
const AUTH_COOKIE_VALUE = "authenticated";
const VALID_COOKIE_VALUES = new Set<string>(["ourcakeproject2025", AUTH_COOKIE_VALUE]);
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function isValidPassword(value: string | null | undefined): boolean {
  if (!value) return false;
  return VALID_COOKIE_VALUES.has(value);
}

export function parseCookieString(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    const v = rest.join("=");
    if (v !== undefined) {
      try {
        result[k] = decodeURIComponent(v);
      } catch {
        result[k] = v;
      }
    }
  }
  return result;
}

export function readUserIdFromCookieHeader(cookieHeader: string | undefined): string | null {
  const jar = parseCookieString(cookieHeader);
  return jar[USER_COOKIE_NAME] ?? null;
}

export function readUserIdFromBrowser(): string | null {
  if (typeof document === "undefined") return null;
  return readUserIdFromCookieHeader(document.cookie);
}

export function setUserCookieInBrowser(value: string, maxAgeSeconds: number = DEFAULT_COOKIE_MAX_AGE_SECONDS): void {
  if (typeof document === "undefined") return;
  const maxAge = Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0 ? Math.floor(maxAgeSeconds) : DEFAULT_COOKIE_MAX_AGE_SECONDS;
  document.cookie = `${USER_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function clearUserCookieInBrowser(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${USER_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  setUserCookieInBrowser(AUTH_COOKIE_VALUE);
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setUserCookieInBrowser(AUTH_COOKIE_VALUE);
  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  clearUserCookieInBrowser();
}
