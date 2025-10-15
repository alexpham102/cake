"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

export type IngredientUnit = "g" | "kg" | "ml" | "l" | "piece";

export interface IngredientCatalogItem {
  id: string;
  name: string;
  packageAmount: number; // numeric amount of the package
  packageUnit: IngredientUnit; // unit for the package amount
  price: number; // total price for the package
}

async function getUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function listIngredientCatalog(): Promise<IngredientCatalogItem[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("ingredient_catalog")
    .select("id, name, package_amount, package_unit, price")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    packageAmount: Math.max(0, Number(row.package_amount ?? 0)),
    packageUnit: (row.package_unit ?? "g") as IngredientUnit,
    price: Math.max(0, Number(row.price ?? 0)),
  }));
}

export async function createOrUpdateIngredientCatalogItem(item: Partial<IngredientCatalogItem> & { name: string; packageAmount: number; packageUnit: IngredientUnit; price: number; id?: string }): Promise<IngredientCatalogItem> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  const payload = {
    name: item.name,
    package_amount: Math.max(0, Number(item.packageAmount || 0)),
    package_unit: item.packageUnit,
    price: Math.max(0, Number(item.price || 0)),
    updated_at: new Date().toISOString(),
  } as const;

  if (item.id) {
    const { data, error } = await supabase
      .from("ingredient_catalog")
      .update(payload)
      .eq("id", item.id)
      .eq("user_id", userId)
      .select("id, name, package_amount, package_unit, price")
      .single();
    if (error || !data) throw error || new Error("Failed to update ingredient catalog item");
    return {
      id: String(data.id),
      name: String(data.name ?? ""),
      packageAmount: Math.max(0, Number(data.package_amount ?? 0)),
      packageUnit: (data.package_unit ?? "g") as IngredientUnit,
      price: Math.max(0, Number(data.price ?? 0)),
    };
  }

  const { data, error } = await supabase
    .from("ingredient_catalog")
    .insert({
      user_id: userId,
      name: item.name,
      package_amount: Math.max(0, Number(item.packageAmount || 0)),
      package_unit: item.packageUnit,
      price: Math.max(0, Number(item.price || 0)),
    })
    .select("id, name, package_amount, package_unit, price")
    .single();
  if (error || !data) throw error || new Error("Failed to insert ingredient catalog item");
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    packageAmount: Math.max(0, Number(data.package_amount ?? 0)),
    packageUnit: (data.package_unit ?? "g") as IngredientUnit,
    price: Math.max(0, Number(data.price ?? 0)),
  };
}

export async function deleteIngredientCatalogItem(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("ingredient_catalog")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export function normalizeToBaseUnit(amount: number, unit: IngredientUnit): { baseAmount: number; baseUnit: Exclude<IngredientUnit, "kg" | "l"> } {
  const value = Math.max(0, Number(amount || 0));
  switch (unit) {
    case "kg":
      return { baseAmount: value * 1000, baseUnit: "g" };
    case "l":
      return { baseAmount: value * 1000, baseUnit: "ml" };
    case "g":
      return { baseAmount: value, baseUnit: "g" };
    case "ml":
      return { baseAmount: value, baseUnit: "ml" };
    case "piece":
    default:
      return { baseAmount: value, baseUnit: "piece" };
  }
}

export function computeCostForUsage(opts: { catalogItem: IngredientCatalogItem; usedAmount: number; usedUnit: IngredientUnit }): number {
  const { catalogItem, usedAmount, usedUnit } = opts;
  if (!catalogItem || !isFinite(usedAmount) || usedAmount <= 0 || !isFinite(catalogItem.price) || catalogItem.price <= 0) return 0;
  const pkgBase = normalizeToBaseUnit(catalogItem.packageAmount, catalogItem.packageUnit);
  const usedBase = normalizeToBaseUnit(usedAmount, usedUnit);
  if (pkgBase.baseUnit !== usedBase.baseUnit) return 0; // incompatible units
  if (pkgBase.baseAmount <= 0) return 0;
  const ratio = usedBase.baseAmount / pkgBase.baseAmount;
  return Math.max(0, catalogItem.price * ratio);
}


