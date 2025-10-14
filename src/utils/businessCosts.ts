"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

export interface EquipmentItem {
  id: string;
  name: string;
  price: number;
  expectedTotalBatches: number;
}

export interface OverheadItem {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface BusinessSettings {
  batchesPerMonth: number;
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

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("business_costs")
    .select("batches_per_month")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { batchesPerMonth: 0 };
  return { batchesPerMonth: Math.max(0, Number(data?.batches_per_month ?? 0)) };
}

export async function upsertBusinessSettings(batchesPerMonth: number): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");
  const payload = {
    user_id: userId,
    batches_per_month: Math.max(0, Math.floor(Number(batchesPerMonth) || 0)),
    updated_at: new Date().toISOString(),
  } as const;
  const { error } = await supabase
    .from("business_costs")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function listEquipment(): Promise<EquipmentItem[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("equipment_items")
    .select("id, name, price, expected_total_batches")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    expectedTotalBatches: Math.max(0, Number(row.expected_total_batches ?? 0)),
  }));
}

export async function createOrUpdateEquipment(item: Partial<EquipmentItem> & { name: string; price: number; expectedTotalBatches: number; id?: string }): Promise<EquipmentItem> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  if (item.id) {
    const { data, error } = await supabase
      .from("equipment_items")
      .update({
        name: item.name,
        price: Math.max(0, Number(item.price || 0)),
        expected_total_batches: Math.max(0, Math.floor(Number(item.expectedTotalBatches || 0))),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", userId)
      .select("id, name, price, expected_total_batches")
      .single();
    if (error || !data) throw error || new Error("Failed to update equipment");
    return {
      id: String(data.id),
      name: String(data.name ?? ""),
      price: Number(data.price ?? 0),
      expectedTotalBatches: Math.max(0, Number(data.expected_total_batches ?? 0)),
    };
  }

  const { data, error } = await supabase
    .from("equipment_items")
    .insert({
      user_id: userId,
      name: item.name,
      price: Math.max(0, Number(item.price || 0)),
      expected_total_batches: Math.max(0, Math.floor(Number(item.expectedTotalBatches || 0))),
    })
    .select("id, name, price, expected_total_batches")
    .single();
  if (error || !data) throw error || new Error("Failed to insert equipment");
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    price: Number(data.price ?? 0),
    expectedTotalBatches: Math.max(0, Number(data.expected_total_batches ?? 0)),
  };
}

export async function deleteEquipment(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("equipment_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listOverheads(): Promise<OverheadItem[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("overhead_items")
    .select("id, name, monthly_amount")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    monthlyAmount: Number(row.monthly_amount ?? 0),
  }));
}

export async function createOrUpdateOverhead(item: Partial<OverheadItem> & { name: string; monthlyAmount: number; id?: string }): Promise<OverheadItem> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  if (item.id) {
    const { data, error } = await supabase
      .from("overhead_items")
      .update({
        name: item.name,
        monthly_amount: Math.max(0, Number(item.monthlyAmount || 0)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", userId)
      .select("id, name, monthly_amount")
      .single();
    if (error || !data) throw error || new Error("Failed to update overhead");
    return {
      id: String(data.id),
      name: String(data.name ?? ""),
      monthlyAmount: Number(data.monthly_amount ?? 0),
    };
  }

  const { data, error } = await supabase
    .from("overhead_items")
    .insert({
      user_id: userId,
      name: item.name,
      monthly_amount: Math.max(0, Number(item.monthlyAmount || 0)),
    })
    .select("id, name, monthly_amount")
    .single();
  if (error || !data) throw error || new Error("Failed to insert overhead");
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    monthlyAmount: Number(data.monthly_amount ?? 0),
  };
}

export async function deleteOverhead(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("overhead_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export function computeEquipmentPerBatch(items: EquipmentItem[]): number {
  return items.reduce((sum, it) => {
    const batches = Math.max(0, Number(it.expectedTotalBatches || 0));
    const price = Math.max(0, Number(it.price || 0));
    if (batches <= 0) return sum;
    return sum + price / batches;
  }, 0);
}

export function computeOverheadPerBatch(overheads: OverheadItem[], batchesPerMonth: number): number {
  const totalMonthly = overheads.reduce((s, o) => s + Math.max(0, Number(o.monthlyAmount || 0)), 0);
  const bpm = Math.max(0, Math.floor(Number(batchesPerMonth || 0)));
  if (bpm <= 0) return 0;
  return totalMonthly / bpm;
}

export async function fetchCombinedPerBatchCost(): Promise<{
  equipmentPerBatch: number;
  overheadPerBatch: number;
  combinedPerBatch: number;
}> {
  const [settings, equipment, overheads] = await Promise.all([
    getBusinessSettings(),
    listEquipment(),
    listOverheads(),
  ]);
  const bpm = settings?.batchesPerMonth ?? 0;
  const equipmentPerBatch = computeEquipmentPerBatch(equipment);
  const overheadPerBatch = computeOverheadPerBatch(overheads, bpm);
  const combinedPerBatch = equipmentPerBatch + overheadPerBatch;
  return { equipmentPerBatch, overheadPerBatch, combinedPerBatch };
}


