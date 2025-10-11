"use client";

import { CostBreakdownPerCake, PricingInputs } from "@/types";
import { calculateBreakdown } from "@/utils/calculations";
import { getSupabaseClient } from "@/lib/supabaseClient";

export interface CakeProfile {
  id: string;
  name: string;
  inputs: PricingInputs;
  breakdown: CostBreakdownPerCake;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

const STORAGE_KEY = "cake_pricing_profiles_v1";

// Remote shapes returned by Supabase RPCs. These are intentionally permissive
// to accommodate differing column/property names across RPCs.
type RemoteIngredientRow = {
  client_item_id?: string | null;
  name?: string | null;
  cost?: number | string | null;
  unit?: string | null;
};

type RemoteAdditionalCostRow = {
  client_item_id?: string | null;
  category?: string | null;
  description?: string | null;
  amount?: number | string | null;
  allocation_type?: "batch" | "per-cake" | string | null;
  allocationType?: "batch" | "per-cake" | string | null;
};

type RemoteProfileRow = {
  client_id?: string | null;
  id?: string | null;
  clientId?: string | null;
  name?: string | null;
  number_of_cakes?: number | string | null;
  numberOfCakes?: number | string | null;
  profit_percentage?: number | string | null;
  profitPercentage?: number | string | null;
  ingredients?: RemoteIngredientRow[] | null;
  additional_costs?: RemoteAdditionalCostRow[] | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): CakeProfile[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CakeProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(profiles: CakeProfile[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore write errors
  }
}

function generateId(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
  return `${slug || "cake"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listCakeProfiles(): CakeProfile[] {
  return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getCakeProfile(id: string): CakeProfile | null {
  return readAll().find((p) => p.id === id) || null;
}

export function deleteCakeProfile(id: string): boolean {
  const current = readAll();
  const next = current.filter((p) => p.id !== id);
  writeAll(next);
  void deleteProfileFromSupabase(id);
  return next.length !== current.length;
}

export function clearAllCakeProfiles(): void {
  writeAll([]);
}

export function saveCakeProfile(params: {
  id?: string;
  name: string;
  inputs: PricingInputs;
  includeBreakdownSnapshot?: boolean; // default true
}): CakeProfile {
  const { id, name, inputs } = params;
  const includeSnapshot = params.includeBreakdownSnapshot !== false;
  const now = new Date().toISOString();

  const snapshot = includeSnapshot ? calculateBreakdown(inputs) : ({} as CostBreakdownPerCake);

  const current = readAll();
  if (id) {
    const idx = current.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const updated: CakeProfile = {
        ...current[idx],
        name,
        inputs,
        breakdown: includeSnapshot ? snapshot : current[idx].breakdown,
        updatedAt: now,
      };
      const next = [...current];
      next[idx] = updated;
      writeAll(next);
      void syncProfileToSupabase(updated);
      return updated;
    }
  }

  const newProfile: CakeProfile = {
    id: generateId(name),
    name,
    inputs,
    breakdown: includeSnapshot ? snapshot : calculateBreakdown(inputs),
    createdAt: now,
    updatedAt: now,
  };
  writeAll([newProfile, ...current]);
  void syncProfileToSupabase(newProfile);
  return newProfile;
}

/**
 * Pull profiles from Supabase and merge them into local storage so saved cakes
 * appear across browsers/devices. This is best-effort and will no-op if not authenticated
 * or if the RPCs are unavailable server-side.
 */
export async function pullProfilesFromSupabaseToLocal(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionResult } = await supabase.auth.getSession();
    if (!sessionResult?.session) return;

    // Try a combined RPC that returns profiles with nested items
    // Expected shape (best effort):
    // [
    //   {
    //     client_id: string,
    //     name: string,
    //     number_of_cakes: number,
    //     profit_percentage: number,
    //     ingredients: [{ name, cost, unit, client_item_id? }],
    //     additional_costs: [{ category, description, amount, allocation_type, client_item_id? }]
    //   }
    // ]
    const { data, error } = await supabase.rpc("list_profiles_with_items");
    if (error) {
      // Fallback: try a simpler list and skip items if unavailable
      console.warn("RPC list_profiles_with_items unavailable, attempting list_profiles. Error:", error?.message ?? error);
    }

    let rows: RemoteProfileRow[] | null = null;
    if (!error && Array.isArray(data)) {
      rows = data;
    } else {
      const { data: fallbackData, error: fallbackErr } = await supabase.rpc("list_profiles");
      if (!fallbackErr && Array.isArray(fallbackData)) {
        rows = fallbackData;
      } else {
        console.warn("No profile listing RPCs available or returned.");
        return;
      }
    }

    if (!rows || rows.length === 0) return;

    const local = readAll();
    const byId = new Map(local.map((p) => [p.id, p] as const));
    const now = new Date().toISOString();

    const toUpsert: CakeProfile[] = [];
    for (const r of rows) {
      const clientId = (r.client_id ?? r.id ?? r.clientId) ?? "";
      if (!clientId) continue;

      const numberOfCakes = Math.max(1, Math.floor(Number(r.number_of_cakes ?? r.numberOfCakes ?? 1)));
      const profitPercentage = Math.max(0, Math.min(1000, Number(r.profit_percentage ?? r.profitPercentage ?? 0)));

      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: RemoteIngredientRow, idx: number) => ({
            id: String(ing.client_item_id ?? `${clientId}-ing-${idx}`),
            name: String(ing.name ?? ""),
            cost: Number(ing.cost ?? 0),
            unit: ing.unit ?? undefined,
          }))
        : [];

      const additionalCosts = Array.isArray(r.additional_costs)
        ? r.additional_costs.map((c: RemoteAdditionalCostRow, idx: number) => ({
            id: String(c.client_item_id ?? `${clientId}-cost-${idx}`),
            category: String(c.category ?? "other"),
            description: c.description ?? undefined,
            amount: Number(c.amount ?? 0),
            allocationType: (c.allocation_type ?? c.allocationType ?? "per-cake") as "batch" | "per-cake",
          }))
        : [];

      const inputs: PricingInputs = {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
      };

      const existing = byId.get(clientId);
      const merged: CakeProfile = existing
        ? {
            ...existing,
            name: String(r.name ?? existing.name ?? "Untitled Cake"),
            inputs,
            breakdown: calculateBreakdown(inputs),
            updatedAt: now,
          }
        : {
            id: clientId,
            name: String(r.name ?? "Untitled Cake"),
            inputs,
            breakdown: calculateBreakdown(inputs),
            createdAt: now,
            updatedAt: now,
          };

      toUpsert.push(merged);
    }

    // Merge into local: prefer the merged versions for ids we received, keep others
    const receivedIds = new Set(toUpsert.map((p) => p.id));
    const survivors = readAll().filter((p) => !receivedIds.has(p.id));
    writeAll([...toUpsert, ...survivors].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
  } catch (e) {
    console.error("Unexpected error pulling profiles:", e);
  }
}

async function syncProfileToSupabase(profile: CakeProfile): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionResult } = await supabase.auth.getSession();
    if (!sessionResult?.session) return; // only sync when authenticated
    // Upsert via public RPC to avoid schema restrictions on the JS client
    const cakesCount = Math.max(1, Math.floor(profile.inputs.numberOfCakes || 1));
    const rawProfit = Math.max(0, Math.min(1000, profile.inputs.profitPercentage || 0));
    
    // WORKAROUND: Disambiguate overloaded RPC by ensuring decimal precision.
    // Supabase has both integer and numeric overloads. Force numeric by adding
    // a tiny decimal that gets rounded in display but disambiguates the call.
    // TODO: Remove integer overload from database, then remove this workaround.
    const profitForRpc = Number.isInteger(rawProfit) ? rawProfit + 0.001 : rawProfit;

    const { data: rpcId, error: rpcErr } = await supabase.rpc("upsert_profile", {
      p_client_id: profile.id,
      p_name: profile.name,
      p_number_of_cakes: cakesCount,
      p_profit_percentage: profitForRpc,
    });
    if (rpcErr || !rpcId) {
      console.error("Failed to upsert profile:", rpcErr?.message ?? rpcErr, rpcErr);
      return;
    }

    const profileId = rpcId;

    // Replace ingredient rows via RPC (best-effort, gracefully handle missing RPCs)
    const ingredientRows = (profile.inputs.ingredients || []).map((ing) => ({
      name: ing.name,
      cost: isFinite(ing.cost) ? ing.cost : 0,
      unit: ing.unit ?? null,
      client_item_id: ing.id ?? null,
    })) satisfies Record<string, unknown>[];
    const ingredientPayload = {
      p_profile_id: profileId,
      p_items: ingredientRows,
    } satisfies Record<string, unknown>;
    const { error: ingErr } = await supabase.rpc("replace_profile_ingredients", ingredientPayload);
    if (ingErr) {
      // Only log non-"not found" errors - missing RPCs are expected in some setups
      if (ingErr.message !== "not found") {
        console.error("Failed to replace ingredients:", ingErr?.message ?? ingErr, ingErr);
      }
    }

    const costRows = (profile.inputs.additionalCosts || []).map((c) => ({
      category: c.category,
      description: c.description ?? null,
      amount: isFinite(c.amount) ? c.amount : 0,
      allocation_type: c.allocationType,
      client_item_id: c.id ?? null,
    })) satisfies Record<string, unknown>[];
    const costPayload = {
      p_profile_id: profileId,
      p_items: costRows,
    } satisfies Record<string, unknown>;
    const { error: costErr } = await supabase.rpc("replace_profile_additional_costs", costPayload);
    if (costErr) {
      // Only log non-"not found" errors - missing RPCs are expected in some setups
      if (costErr.message !== "not found") {
        console.error("Failed to replace additional costs:", costErr?.message ?? costErr, costErr);
      }
    }
  } catch (e) {
    console.error("Unexpected error syncing profile:", e);
  }
}

export async function syncAllLocalCakeProfilesToSupabase(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionResult } = await supabase.auth.getSession();
    if (!sessionResult?.session) return;
    const all = readAll();
    for (const p of all) {
      await syncProfileToSupabase(p);
    }
  } catch {
    // Gracefully ignore when Supabase is not configured
    return;
  }
}

async function deleteProfileFromSupabase(clientId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionResult } = await supabase.auth.getSession();
    if (!sessionResult?.session) return;
    const { error } = await supabase.rpc("delete_profile_by_client_id", { p_client_id: clientId });
    if (error) {
      console.error("Failed to delete profile in Supabase:", error?.message ?? error, error);
    }
  } catch (e) {
    console.error("Failed to delete profile in Supabase:", e);
  }
}

