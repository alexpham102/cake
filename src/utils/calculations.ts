import { AdditionalCostItem, CostBreakdownPerCake, PricingInputs } from "@/types";

export function sumIngredients(ingredients: PricingInputs["ingredients"]): number {
  return ingredients.reduce((sum, ing) => sum + (isFinite(ing.cost) ? ing.cost : 0), 0);
}

export function sumAdditionalCosts(additionalCosts: AdditionalCostItem[], type: AdditionalCostItem["allocationType"]): number {
  return additionalCosts
    .filter((c) => c.allocationType === type)
    .reduce((sum, c) => sum + (isFinite(c.amount) ? c.amount : 0), 0);
}

export function clampNumber(value: number, min: number, max: number = Number.POSITIVE_INFINITY): number {
  if (!isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function calculateBreakdown(inputs: PricingInputs): CostBreakdownPerCake {
  const numberOfCakes = Math.max(1, Math.floor(inputs.numberOfCakes || 1));
  const profitPercentage = clampNumber(inputs.profitPercentage || 0, 0, 1000);
  const profitMode = inputs.profitMode ?? "percentage";
  const profitFixedAmount = clampNumber(inputs.profitFixedAmount || 0, 0);

  const totalIngredientCost = sumIngredients(inputs.ingredients);
  const totalPerBatchAdditionalCosts = sumAdditionalCosts(inputs.additionalCosts, "batch");
  const totalPerCakeAdditionalCosts = sumAdditionalCosts(inputs.additionalCosts, "per-cake");

  const ingredientCostPerCake = totalIngredientCost / numberOfCakes;
  const allocatedBatchCostsPerCake = totalPerBatchAdditionalCosts / numberOfCakes;
  const perCakeAdditionalCosts = allocatedBatchCostsPerCake + totalPerCakeAdditionalCosts;
  const totalCostPerCake = ingredientCostPerCake + perCakeAdditionalCosts;

  const profitPerCake =
    profitMode === "fixed"
      ? profitFixedAmount
      : totalCostPerCake * (profitPercentage / 100);
  const sellingPricePerCake = totalCostPerCake + profitPerCake;

  return {
    ingredientCostPerCake,
    allocatedBatchCostsPerCake,
    perCakeAdditionalCosts,
    totalCostPerCake,
    profitPerCake,
    sellingPricePerCake,
    totals: {
      totalIngredientCost,
      totalPerBatchAdditionalCosts,
      totalPerCakeAdditionalCosts,
    },
  };
}

export function formatMoney(value: number): string {
  const fixed = isFinite(value) ? value : 0;
  const formatted = fixed.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${formatted} đ`;
}


