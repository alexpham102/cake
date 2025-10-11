export const USER_COOKIE_NAME = "cp_uid";

const VALID_PASSWORDS = new Set<string>(["ourcakeproject2025"]);

export function isValidPassword(value: string | null | undefined): boolean {
  if (!value) return false;
  return VALID_PASSWORDS.has(value);
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

export function clearUserCookieInBrowser(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${USER_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}


import { getSupabaseClient } from "@/lib/supabaseClient";

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}


