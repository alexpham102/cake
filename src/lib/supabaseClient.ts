"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  // Persist client instance across HMR in dev to avoid multiple GoTrueClient warnings
  var __supabaseClient: SupabaseClient | undefined;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientSingleton: SupabaseClient;

// Build the singleton at module load to avoid any race between concurrent callers
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const message = "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY";
  clientSingleton = new Proxy({}, {
    get() {
      throw new Error(message);
    },
  }) as SupabaseClient;
} else if (typeof window !== "undefined") {
  if (!globalThis.__supabaseClient) {
    const created = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: "cake-pricing-auth-v1",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    Object.defineProperty(globalThis, "__supabaseClient", {
      value: created,
      writable: false,
      configurable: false,
      enumerable: false,
    });
  }
  clientSingleton = globalThis.__supabaseClient as SupabaseClient;
} else {
  // Server-side client (separate instance, does not affect browser storage)
  clientSingleton = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: "cake-pricing-auth-v1",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  return clientSingleton;
}

