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
    const userId = sessionResult?.session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        client_id,
        name,
        number_of_cakes,
        profit_percentage,
        created_at,
        updated_at,
        profile_ingredients (
          client_item_id,
          name,
          cost,
          unit
        ),
        profile_additional_costs (
          client_item_id,
          category,
          description,
          amount,
          allocation_type
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profiles from Supabase:", error);
      return;
    }
    if (!Array.isArray(data)) return;

    const remoteProfiles: CakeProfile[] = data.map((row) => {
      const clientId = row.client_id || row.id || generateId(row.name ?? "Untitled Cake");
      const ingredients = Array.isArray(row.profile_ingredients)
        ? row.profile_ingredients.map((ing, idx) => ({
            id: String(ing?.client_item_id ?? `${clientId}-ing-${idx}`),
            name: String(ing?.name ?? ""),
            cost: Number(ing?.cost ?? 0),
            unit: ing?.unit ?? undefined,
          }))
        : [];

      const additionalCosts = Array.isArray(row.profile_additional_costs)
        ? row.profile_additional_costs.map((c, idx) => ({
            id: String(c?.client_item_id ?? `${clientId}-cost-${idx}`),
            category: String(c?.category ?? "other"),
            description: c?.description ?? undefined,
            amount: Number(c?.amount ?? 0),
            allocationType: (c?.allocation_type ?? "per-cake") as "batch" | "per-cake",
          }))
        : [];

      const inputs: PricingInputs = {
        ingredients,
        additionalCosts,
        numberOfCakes: Math.max(1, Math.floor(Number(row.number_of_cakes ?? 1))),
        profitPercentage: Math.max(0, Math.min(1000, Number(row.profit_percentage ?? 0))),
      };

      const createdAt = row.created_at ?? new Date().toISOString();
      const updatedAt = row.updated_at ?? createdAt;

      return {
        id: clientId,
        name: row.name ?? "Untitled Cake",
        inputs,
        breakdown: calculateBreakdown(inputs),
        createdAt,
        updatedAt,
      };
    });

    const local = readAll();
    const receivedIds = new Set(remoteProfiles.map((p) => p.id));
    const survivors = local.filter((p) => !receivedIds.has(p.id));
    writeAll([...remoteProfiles, ...survivors].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
  } catch (e) {
    console.error("Unexpected error pulling profiles:", e);
  }
}

async function syncProfileToSupabase(profile: CakeProfile): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionResult } = await supabase.auth.getSession();
    const userId = sessionResult?.session?.user?.id;
    if (!userId) return;

    const numberOfCakes = Math.max(1, Math.floor(profile.inputs.numberOfCakes || 1));
    const profitPercentage = Math.max(0, Math.min(1000, profile.inputs.profitPercentage || 0));

    const baseRow = {
      user_id: userId,
      client_id: profile.id,
      name: profile.name,
      number_of_cakes: numberOfCakes,
      profit_percentage: profitPercentage,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertErr } = await supabase
      .from("profiles")
      .upsert(baseRow, { onConflict: "user_id,client_id" })
      .select("id")
      .single();

    if (upsertErr || !upserted) {
      console.error("Failed to upsert profile:", upsertErr?.message ?? upsertErr, upsertErr);
      return;
    }

    const profileId = upserted.id as string;

    const { error: deleteIngredientsErr } = await supabase.from("profile_ingredients").delete().eq("profile_id", profileId);
    if (deleteIngredientsErr) {
      console.error("Failed to clear profile ingredients:", deleteIngredientsErr?.message ?? deleteIngredientsErr, deleteIngredientsErr);
      return;
    }

    const ingredientRows = (profile.inputs.ingredients || []).map((ing) => ({
      profile_id: profileId,
      client_item_id: ing.id ?? null,
      name: ing.name,
      cost: isFinite(ing.cost) ? ing.cost : 0,
      unit: ing.unit ?? null,
    }));
    if (ingredientRows.length > 0) {
      const { error: insertIngredientsErr } = await supabase.from("profile_ingredients").insert(ingredientRows);
      if (insertIngredientsErr) {
        console.error("Failed to insert profile ingredients:", insertIngredientsErr?.message ?? insertIngredientsErr, insertIngredientsErr);
        return;
      }
    }

    const { error: deleteCostsErr } = await supabase.from("profile_additional_costs").delete().eq("profile_id", profileId);
    if (deleteCostsErr) {
      console.error("Failed to clear profile additional costs:", deleteCostsErr?.message ?? deleteCostsErr, deleteCostsErr);
      return;
    }

    const costRows = (profile.inputs.additionalCosts || []).map((c) => ({
      profile_id: profileId,
      client_item_id: c.id ?? null,
      category: c.category,
      description: c.description ?? null,
      amount: isFinite(c.amount) ? c.amount : 0,
      allocation_type: c.allocationType,
    }));
    if (costRows.length > 0) {
      const { error: insertCostsErr } = await supabase.from("profile_additional_costs").insert(costRows);
      if (insertCostsErr) {
        console.error("Failed to insert profile additional costs:", insertCostsErr?.message ?? insertCostsErr, insertCostsErr);
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
    const userId = sessionResult?.session?.user?.id;
    if (!userId) return;

    const { data: row, error: fetchErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("client_id", clientId)
      .single();
    if (fetchErr || !row) {
      if (fetchErr && fetchErr.code !== "PGRST116") {
        console.error("Failed to locate profile before delete:", fetchErr?.message ?? fetchErr, fetchErr);
      }
      return;
    }

    const profileId = row.id as string;
    const { error: deleteCostsErr } = await supabase.from("profile_additional_costs").delete().eq("profile_id", profileId);
    if (deleteCostsErr) {
      console.error("Failed to delete related additional costs:", deleteCostsErr?.message ?? deleteCostsErr, deleteCostsErr);
      return;
    }

    const { error: deleteIngredientsErr } = await supabase.from("profile_ingredients").delete().eq("profile_id", profileId);
    if (deleteIngredientsErr) {
      console.error("Failed to delete related ingredients:", deleteIngredientsErr?.message ?? deleteIngredientsErr, deleteIngredientsErr);
      return;
    }

    const { error: deleteProfileErr } = await supabase.from("profiles").delete().eq("id", profileId);
    if (deleteProfileErr) {
      console.error("Failed to delete profile:", deleteProfileErr?.message ?? deleteProfileErr, deleteProfileErr);
    }
  } catch (e) {
    console.error("Failed to delete profile in Supabase:", e);
  }
}
