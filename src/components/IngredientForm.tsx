"use client";

import { useState } from "react";
import { Ingredient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IngredientFormProps {
  onAdd: (ingredient: Omit<Ingredient, "id">) => void;
}

export default function IngredientForm({ onAdd }: IngredientFormProps) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const costNum = Number(cost);
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
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
        />
        <Input
          aria-label="Cost"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          type="number"
          min={0}
          step="0.01"
          required
        />
        <Button type="submit">Add Ingredient</Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}


