"use client";

import { CostBreakdownPerCake, ProfitMode } from "@/types";
import { formatMoney } from "@/utils/calculations";

interface ResultsSummaryProps {
  breakdown: CostBreakdownPerCake;
  numberOfCakes: number;
  profitPercentage: number;
  profitMode?: ProfitMode;
}

export default function ResultsSummary({ breakdown, numberOfCakes, profitPercentage, profitMode = "percentage" }: ResultsSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Total ingredient cost</span><span>{formatMoney(breakdown.totals.totalIngredientCost)}</span></div>
            <div className="flex justify-between"><span>Total per-batch costs</span><span>{formatMoney(breakdown.totals.totalPerBatchAdditionalCosts)}</span></div>
            <div className="flex justify-between"><span>Total per-cake costs</span><span>{formatMoney(breakdown.totals.totalPerCakeAdditionalCosts)}</span></div>
            <div className="flex justify-between"><span>Number of cakes</span><span>{numberOfCakes}</span></div>
            <div className="flex justify-between font-semibold"><span>Cost per cake</span><span>{formatMoney(breakdown.totalCostPerCake)}</span></div>
            {profitMode === "percentage" ? (
              <div className="flex justify-between"><span>Profit margin</span><span>{profitPercentage}%</span></div>
            ) : (
              <div className="flex justify-between"><span>Fixed profit per cake</span><span>{formatMoney(breakdown.profitPerCake)}</span></div>
            )}
            <div className="flex justify-between"><span>Profit per cake</span><span className="text-green-700">{formatMoney(breakdown.profitPerCake)}</span></div>
          </div>
        </div>
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Recommended Selling Price</h3>
          <div className="text-3xl font-bold text-orange-600">{formatMoney(breakdown.sellingPricePerCake)}</div>
        </div>
      </div>

      <details className="border rounded p-4">
        <summary className="cursor-pointer font-medium">Detailed cost breakdown per cake</summary>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span>Ingredient cost</span><span>{formatMoney(breakdown.ingredientCostPerCake)}</span></div>
          <div className="flex justify-between"><span>Allocated batch costs</span><span>{formatMoney(breakdown.allocatedBatchCostsPerCake)}</span></div>
          <div className="flex justify-between"><span>Per-cake additional costs</span><span>{formatMoney(breakdown.perCakeAdditionalCosts)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total cost per cake</span><span>{formatMoney(breakdown.totalCostPerCake)}</span></div>
        </div>
      </details>
    </div>
  );
}


