export type AllocationType = "batch" | "per-cake";

export type ProfitMode = "percentage" | "fixed";

export interface Ingredient {
  id: string;
  name: string;
  cost: number; // total cost for the ingredient amount used in batch
  unit?: string;
}

export interface AdditionalCostItem {
  id: string;
  category: string;
  description?: string;
  amount: number;
  allocationType: AllocationType;
}

export interface PricingInputs {
  ingredients: Ingredient[];
  additionalCosts: AdditionalCostItem[];
  numberOfCakes: number; // must be >= 1
  profitPercentage: number; // must be >= 0
  // When set to "fixed", use profitFixedAmount per cake instead of percentage
  profitMode?: ProfitMode; // default: "fixed" for new sessions; "percentage" for loaded legacy profiles
  profitFixedAmount?: number; // must be >= 0
}

export interface CostBreakdownPerCake {
  ingredientCostPerCake: number;
  allocatedBatchCostsPerCake: number;
  perCakeAdditionalCosts: number;
  totalCostPerCake: number;
  profitPerCake: number;
  sellingPricePerCake: number;
  totals: {
    totalIngredientCost: number;
    totalPerBatchAdditionalCosts: number;
    totalPerCakeAdditionalCosts: number;
  };
}


