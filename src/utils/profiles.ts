"use client";

import { CostBreakdownPerCake, PricingInputs } from "@/types";
import { calculateBreakdown } from "@/utils/calculations";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { readUserIdFromBrowser } from "@/lib/auth";

export interface CakeProfile {
  id: string;
  name: string;
  inputs: PricingInputs;
  breakdown: CostBreakdownPerCake;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

const STORAGE_KEY = "cake_pricing_profiles_v1";

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
    const uid = readUserIdFromBrowser();
    if (!uid) return;
    const supabase = getSupabaseClient();

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
      // eslint-disable-next-line no-console
      console.warn("RPC list_profiles_with_items unavailable, attempting list_profiles. Error:", error?.message ?? error);
    }

    let rows: any[] | null = null;
    if (!error && Array.isArray(data)) {
      rows = data as any[];
    } else {
      const { data: fallbackData, error: fallbackErr } = await supabase.rpc("list_profiles");
      if (!fallbackErr && Array.isArray(fallbackData)) {
        rows = fallbackData as any[];
      } else {
        // eslint-disable-next-line no-console
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
      const clientId: string = r.client_id ?? r.id ?? r.clientId;
      if (!clientId) continue;

      const numberOfCakes = Math.max(1, Math.floor(Number(r.number_of_cakes ?? r.numberOfCakes ?? 1)));
      const profitPercentage = Math.max(0, Math.min(1000, Number(r.profit_percentage ?? r.profitPercentage ?? 0)));

      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: any) => ({
            id: ing.client_item_id ?? undefined,
            name: String(ing.name ?? ""),
            cost: Number(ing.cost ?? 0),
            unit: ing.unit ?? undefined,
          }))
        : [];

      const additionalCosts = Array.isArray(r.additional_costs)
        ? r.additional_costs.map((c: any) => ({
            id: c.client_item_id ?? undefined,
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
    // eslint-disable-next-line no-console
    console.error("Unexpected error pulling profiles:", e);
  }
}

async function syncProfileToSupabase(profile: CakeProfile): Promise<void> {
  try {
    const uid = readUserIdFromBrowser();
    if (!uid) return; // only sync when authenticated
    const supabase = getSupabaseClient();
    // Upsert via public RPC to avoid schema restrictions on the JS client
    const { data: rpcId, error: rpcErr } = await supabase.rpc("upsert_profile", {
      p_client_id: profile.id,
      p_name: profile.name,
      p_number_of_cakes: Math.max(1, Math.floor(profile.inputs.numberOfCakes || 1)),
      p_profit_percentage: Math.max(0, Math.min(1000, profile.inputs.profitPercentage || 0)),
    });
    if (rpcErr || !rpcId) {
      // eslint-disable-next-line no-console
      console.error("Failed to upsert profile:", rpcErr?.message ?? rpcErr, rpcErr);
      return;
    }

    const profileId = rpcId as unknown as string;

    // Replace ingredient rows via RPC
    const ingredientRows = (profile.inputs.ingredients || []).map((ing) => ({
      name: ing.name,
      cost: isFinite(ing.cost) ? ing.cost : 0,
      unit: ing.unit ?? null,
      client_item_id: ing.id ?? null,
    }));
    const { error: ingErr } = await supabase.rpc("replace_profile_ingredients", {
      p_profile_id: profileId,
      p_items: ingredientRows as unknown as object, // jsonb
    });
    if (ingErr) {
      // eslint-disable-next-line no-console
      console.error("Failed to replace ingredients:", ingErr?.message ?? ingErr, ingErr);
    }

    const costRows = (profile.inputs.additionalCosts || []).map((c) => ({
      category: c.category,
      description: c.description ?? null,
      amount: isFinite(c.amount) ? c.amount : 0,
      allocation_type: c.allocationType,
      client_item_id: c.id ?? null,
    }));
    const { error: costErr } = await supabase.rpc("replace_profile_additional_costs", {
      p_profile_id: profileId,
      p_items: costRows as unknown as object,
    });
    if (costErr) {
      // eslint-disable-next-line no-console
      console.error("Failed to replace additional costs:", costErr?.message ?? costErr, costErr);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error syncing profile:", e);
  }
}

export async function syncAllLocalCakeProfilesToSupabase(): Promise<void> {
  const uid = readUserIdFromBrowser();
  if (!uid) return;
  const all = readAll();
  for (const p of all) {
    // eslint-disable-next-line no-await-in-loop
    await syncProfileToSupabase(p);
  }
}

async function deleteProfileFromSupabase(clientId: string): Promise<void> {
  try {
    const uid = readUserIdFromBrowser();
    if (!uid) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("delete_profile_by_client_id", { p_client_id: clientId });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete profile in Supabase:", error?.message ?? error, error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to delete profile in Supabase:", e);
  }
}


