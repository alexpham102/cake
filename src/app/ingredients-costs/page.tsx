"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/utils/calculations";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  IngredientCatalogItem,
  IngredientUnit,
  listIngredientCatalog,
  createOrUpdateIngredientCatalogItem,
  deleteIngredientCatalogItem,
  normalizeToBaseUnit,
} from "@/utils/ingredientsCatalog";

const UNITS: IngredientUnit[] = ["g", "kg", "ml", "l", "piece"];

export default function IngredientsCostsPage() {
  const [items, setItems] = useState<IngredientCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authMissing, setAuthMissing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [unit, setUnit] = useState<IngredientUnit>("g");
  const [price, setPrice] = useState<string>("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editUnit, setEditUnit] = useState<IngredientUnit>("g");
  const [editPrice, setEditPrice] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id ?? null;
        if (!userId) {
          setAuthMissing(true);
          setItems([]);
          return;
        }
        const rows = await listIngredientCatalog();
        setAuthMissing(false);
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAdd() {
    const nm = (name || "").trim();
    const amt = Math.max(0, Number((amount || "").replace(/\D/g, "")) || 0);
    const pr = Math.max(0, Number((price || "").replace(/\D/g, "")) || 0);
    if (!nm || amt <= 0 || pr < 0) return;
    try {
      setActionError(null);
      await createOrUpdateIngredientCatalogItem({ name: nm, packageAmount: amt, packageUnit: unit, price: pr });
      setName("");
      setAmount("");
      setUnit("g");
      setPrice("");
      setItems(await listIngredientCatalog());
    } catch (e) {
      setActionError("Could not add ingredient cost. Please login and try again.");
    }
  }

  function startEdit(it: IngredientCatalogItem) {
    setEditingId(it.id);
    setEditName(it.name);
    setEditAmount(String(it.packageAmount));
    setEditUnit(it.packageUnit);
    setEditPrice(String(it.price));
  }

  async function saveEdit(id: string) {
    const nm = (editName || "").trim();
    const amt = Math.max(0, Number((editAmount || "").replace(/\D/g, "")) || 0);
    const pr = Math.max(0, Number((editPrice || "").replace(/\D/g, "")) || 0);
    if (!nm || amt <= 0 || pr < 0) return;
    try {
      setActionError(null);
      await createOrUpdateIngredientCatalogItem({ id, name: nm, packageAmount: amt, packageUnit: editUnit, price: pr });
      setEditingId(null);
      setItems(await listIngredientCatalog());
    } catch (e) {
      setActionError("Could not save changes. Please login and try again.");
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const perUnitHints = useMemo(() => {
    const byId: Record<string, string> = {};
    for (const it of items) {
      const pkg = normalizeToBaseUnit(it.packageAmount, it.packageUnit);
      const per = pkg.baseAmount > 0 ? it.price / pkg.baseAmount : 0;
      const label = `${formatMoney(per)} / ${pkg.baseUnit}`;
      byId[it.id] = label;
    }
    return byId;
  }, [items]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (authMissing) {
    return (
      <div className="min-h-screen p-6 sm:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Ingredients Costs</h1>
          <p className="text-gray-600">Please log in to manage your Ingredients Costs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">Ingredients Costs</h1>
          <p className="text-gray-600">Define package size and price so recipes can auto-calculate usage cost.</p>
        </header>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Add Ingredient Cost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] items-center gap-2">
                <Input placeholder="Name (e.g., Flour)" value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  placeholder="Amount"
                  value={amount ? Number(amount).toLocaleString('vi-VN') : ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setAmount(digitsOnly);
                  }}
                  inputMode="numeric"
                />
                <select className="border rounded px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value as IngredientUnit)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <Input
                  placeholder="Price"
                  value={price ? Number(price).toLocaleString('vi-VN') : ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setPrice(digitsOnly);
                  }}
                  inputMode="numeric"
                />
                <Button onClick={handleAdd}>Add</Button>
              </div>
              <p className="text-xs text-gray-600">Example: 1000 g at 25,000 đ.</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Catalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No items yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Package</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Hint</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => {
                      const inEdit = editingId === it.id;
                      const pkgLabel = `${it.packageAmount.toLocaleString('vi-VN')} ${it.packageUnit}`;
                      return (
                        <TableRow key={it.id}>
                          <TableCell>
                            {inEdit ? (
                              <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            ) : (
                              it.name
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {inEdit ? (
                              <div className="flex items-center gap-2 justify-end">
                                <Input
                                  className="h-8 text-right w-32"
                                  value={editAmount ? Number(editAmount).toLocaleString('vi-VN') : ""}
                                  onChange={(e) => {
                                    const raw = e.target.value || "";
                                    const digitsOnly = raw.replace(/\D/g, "");
                                    setEditAmount(digitsOnly);
                                  }}
                                  inputMode="numeric"
                                />
                                <select className="h-8 border rounded px-2" value={editUnit} onChange={(e) => setEditUnit(e.target.value as IngredientUnit)}>
                                  {UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              pkgLabel
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {inEdit ? (
                              <Input
                                className="h-8 text-right"
                                value={editPrice ? Number(editPrice).toLocaleString('vi-VN') : ""}
                                onChange={(e) => {
                                  const raw = e.target.value || "";
                                  const digitsOnly = raw.replace(/\D/g, "");
                                  setEditPrice(digitsOnly);
                                }}
                                inputMode="numeric"
                              />
                            ) : (
                              formatMoney(it.price)
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-600 text-xs">{perUnitHints[it.id]}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {inEdit ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(it.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEdit(it)}>Edit</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        setActionError(null);
                                        await deleteIngredientCatalogItem(it.id);
                                        setItems(await listIngredientCatalog());
                                      } catch (e) {
                                        setActionError("Could not delete item. Please login and try again.");
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {actionError ? (
                <div className="text-sm text-red-600">{actionError}</div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}


