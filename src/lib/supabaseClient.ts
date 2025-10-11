"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  // Persist client instance across HMR in dev to avoid multiple GoTrueClient warnings
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  // Reuse an existing client if present (module cache or global for HMR)
  if (typeof window !== "undefined" && globalThis.__supabaseClient) {
    return globalThis.__supabaseClient;
  }
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Gracefully no-op when env missing to avoid breaking local-only flows
  if (!url || !anonKey) {
    const message = "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY";
    return new Proxy({}, {
      get() {
        throw new Error(message);
      },
    }) as SupabaseClient;
  }

  const client = createClient(url, anonKey, {
    auth: {
      // Use a stable, app-specific storage key so only this singleton uses it
      storageKey: "cake-pricing-auth-v1",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  cachedClient = client;
  if (typeof window !== "undefined") {
    globalThis.__supabaseClient = client;
  }
  return client;
}


