"use client";

import { useMemo, useState } from "react";
import { Ingredient } from "@/types";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface IngredientsCalculatorProps {
  ingredients: Ingredient[];
  numberOfCakes: number;
}

function parseAmountAndUnit(unitRaw?: string): { amount: number | null; unitSuffix: string } {
  if (!unitRaw) return { amount: null, unitSuffix: "" };
  const trimmed = unitRaw.trim();
  if (!trimmed) return { amount: null, unitSuffix: "" };

  // Match leading numeric-like token(s) and keep the remainder as suffix
  const match = trimmed.match(/^([\d\s.,/]+)\s*(.*)$/);
  if (!match) return { amount: null, unitSuffix: trimmed };
  const numericPart = (match[1] || "").trim();
  const suffix = (match[2] || "").trim();

  // Try fraction a/b
  const frac = numericPart.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (isFinite(num) && isFinite(den) && den !== 0) return { amount: num / den, unitSuffix: suffix };
  }

  // Normalize decimal separators: prefer dot as decimal
  let normalized = numericPart.replace(/\s/g, "").replace(/,/g, ".");
  // If multiple dots, keep the first as decimal, drop others as thousands
  const firstDot = normalized.indexOf(".");
  if (firstDot !== -1) {
    const head = normalized.slice(0, firstDot + 1);
    const tail = normalized.slice(firstDot + 1).replace(/\./g, "");
    normalized = head + tail;
  }
  const amount = parseFloat(normalized);
  if (!isFinite(amount)) return { amount: null, unitSuffix: suffix || trimmed };
  return { amount, unitSuffix: suffix };
}

function formatQuantity(value: number): string {
  if (!isFinite(value)) return "-";
  const abs = Math.abs(value);
  const precision = abs === 0 ? 0 : abs < 1 ? 2 : abs < 10 ? 2 : abs < 100 ? 1 : 0;
  const fixed = value.toFixed(precision);
  // Trim trailing zeros and dot
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export default function IngredientsCalculator({ ingredients, numberOfCakes }: IngredientsCalculatorProps) {
  const baseCakes = Math.max(1, Math.floor(numberOfCakes || 1));
  const [targetCakes, setTargetCakes] = useState<number>(1);

  const rows = useMemo(() => {
    return ingredients.map((ing) => {
      const { amount, unitSuffix } = parseAmountAndUnit(ing.unit);
      if (amount == null) {
        return {
          id: ing.id,
          name: ing.name,
          batch: ing.unit || "-",
          perCake: "-",
          scaled: "-",
        };
      }
      const perCakeVal = amount / baseCakes;
      const scaledVal = perCakeVal * Math.max(1, Math.floor(targetCakes || 1));
      return {
        id: ing.id,
        name: ing.name,
        batch: `${formatQuantity(amount)}${unitSuffix ? " " + unitSuffix : ""}`,
        perCake: `${formatQuantity(perCakeVal)}${unitSuffix ? " " + unitSuffix : ""}`,
        scaled: `${formatQuantity(scaledVal)}${unitSuffix ? " " + unitSuffix : ""}`,
      };
    });
  }, [ingredients, baseCakes, targetCakes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <div className="text-sm text-gray-600">Batch size</div>
          <div className="text-base font-medium">{baseCakes} cake{baseCakes > 1 ? "s" : ""}</div>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="target-cakes">Desired cakes</label>
          <Input
            id="target-cakes"
            aria-label="Desired cakes"
            type="number"
            min={1}
            value={targetCakes}
            onChange={(e) => setTargetCakes(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Batch unit</TableHead>
              <TableHead>Per cake</TableHead>
              <TableHead>{`For ${Math.max(1, Math.floor(targetCakes || 1))} cake(s)`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.batch}</TableCell>
                <TableCell>{r.perCake}</TableCell>
                <TableCell>{r.scaled}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {ingredients.length === 0 ? (
          <div className="text-sm text-gray-500">No ingredients added yet.</div>
        ) : null}
      </div>
      <p className="text-xs text-gray-600">
        Per-cake quantities are derived by dividing each ingredient's batch unit by the current batch size.
        Enter your desired number of cakes to scale the amounts.
      </p>
    </div>
  );
}


