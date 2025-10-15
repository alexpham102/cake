"use client";

import { useEffect, useMemo, useState } from "react";
import { Ingredient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IngredientCatalogItem, IngredientUnit, computeCostForUsage, listIngredientCatalog } from "@/utils/ingredientsCatalog";

interface IngredientFormProps {
  onAdd: (ingredient: Omit<Ingredient, "id">) => void;
}

export default function IngredientForm({ onAdd }: IngredientFormProps) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<IngredientCatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [usedAmount, setUsedAmount] = useState<string>("");
  const [usedUnit, setUsedUnit] = useState<IngredientUnit>("g");

  useEffect(() => {
    (async () => {
      try {
        const items = await listIngredientCatalog();
        setCatalog(items);
      } catch {
        setCatalog([]);
      }
    })();
  }, []);

  const selectedItem = useMemo(() => catalog.find((c) => c.id === selectedCatalogId) || null, [catalog, selectedCatalogId]);
  const autoCost = useMemo(() => {
    const amt = Math.max(0, Number((usedAmount || "").replace(/\D/g, "")) || 0);
    if (!selectedItem || amt <= 0) return 0;
    return Math.round(computeCostForUsage({ catalogItem: selectedItem, usedAmount: amt, usedUnit }));
  }, [selectedItem, usedAmount, usedUnit]);

  // When a catalog item is chosen, auto-fill the ingredient name from the category
  useEffect(() => {
    if (selectedItem) {
      setName(selectedItem.name);
    }
  }, [selectedItem]);

  // When a catalog item is chosen and the user specifies usage, auto-fill the unit as "<amount> <unit>"
  useEffect(() => {
    if (selectedItem) {
      const amt = (usedAmount || "").replace(/\D/g, "");
      const display = amt ? `${Number(amt).toLocaleString('vi-VN')} ${usedUnit}` : "";
      setUnit(display);
    }
  }, [selectedItem, usedAmount, usedUnit]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const costNum = selectedItem ? autoCost : Number(cost);
    if (!name.trim()) {
      setError("Ingredient name is required");
      return;
    }
    if (!isFinite(costNum) || costNum < 0) {
      setError("Cost must be a number ≥ 0");
      return;
    }
    onAdd({ name: name.trim(), cost: costNum, unit: unit.trim() || undefined });
    setName("");
    setCost("");
    setUnit("");
    setError(null);
    setSelectedCatalogId("");
    setUsedAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Category</span>
          <Select value={selectedCatalogId || "__none"} onValueChange={(v) => setSelectedCatalogId(v === "__none" ? "" : v)}>
            <SelectTrigger size="sm" className="min-w-56" aria-label="Select catalog ingredient">
              <SelectValue placeholder="Optional: choose from Ingredients Costs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {catalog.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.packageAmount.toLocaleString('vi-VN')} {c.packageUnit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedItem ? (
          <div className="text-sm text-gray-600">
            Auto cost: {autoCost.toLocaleString('vi-VN')} đ
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] items-center gap-2">
        <Input
          aria-label="Ingredient name"
          placeholder="Ingredient name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          aria-label="Unit"
          placeholder="Unit (e.g., grams)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          readOnly={!!selectedItem}
        />
        {selectedItem ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Usage amount"
              placeholder="Amount"
              value={usedAmount ? Number(usedAmount).toLocaleString('vi-VN') : ""}
              onChange={(e) => {
                const raw = e.target.value || "";
                const digitsOnly = raw.replace(/\D/g, "");
                setUsedAmount(digitsOnly);
              }}
              type="text"
              inputMode="numeric"
            />
            <Select value={usedUnit} onValueChange={(v) => setUsedUnit(v as IngredientUnit)}>
              <SelectTrigger size="sm" className="min-w-20" aria-label="Usage unit">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="l">l</SelectItem>
                <SelectItem value="piece">piece</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Input
            aria-label="Cost"
            placeholder="Cost"
            value={cost ? Number(cost).toLocaleString('vi-VN') : ""}
            onChange={(e) => {
              const raw = e.target.value || "";
              const digitsOnly = raw.replace(/\D/g, "");
              setCost(digitsOnly);
            }}
            type="text"
            inputMode="numeric"
            required
          />
        )}
        <Button type="submit">Add Ingredient</Button>
      </div>

      

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}


