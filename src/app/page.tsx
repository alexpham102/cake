"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import IngredientForm from "@/components/IngredientForm";
import IngredientList from "@/components/IngredientList";
import AdditionalCostForm from "@/components/AdditionalCostForm";
import AdditionalCostList from "@/components/AdditionalCostList";
import ProductionCalculator from "@/components/ProductionCalculator";
import ProfitCalculator from "@/components/ProfitCalculator";
import ResultsSummary from "@/components/ResultsSummary";
import { AdditionalCostItem, Ingredient, ProfitMode } from "@/types";
import { calculateBreakdown } from "@/utils/calculations";
import { saveCakeProfileRemote, getCakeProfileRemote } from "@/utils/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// removed unused import
import { fetchCombinedPerBatchCost } from "@/utils/businessCosts";

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureUniqueIds<T extends { id?: string }>(items: T[], prefix: string): (T & { id: string })[] {
  const seen = new Set<string>();
  return items.map((item) => {
    let id = item.id ?? "";
    if (!id || seen.has(id)) {
      do {
        id = generateId(prefix);
      } while (seen.has(id));
    }
    seen.add(id);
    return { ...item, id } as T & { id: string };
  });
}

function HomeContent() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([]);
  const [numberOfCakes, setNumberOfCakes] = useState<number>(1);
  const [profitMode, setProfitMode] = useState<ProfitMode>("fixed");
  const [profitPercentage, setProfitPercentage] = useState<number>(0);
  const [profitFixedAmount, setProfitFixedAmount] = useState<number>(0);
  const [cakeName, setCakeName] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>("");
  const params = useSearchParams();
  const [businessPerBatchCost, setBusinessPerBatchCost] = useState<number>(0);

  // Ingredient handlers
  function addIngredient(ing: Omit<Ingredient, "id">) {
    setIngredients((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      let id: string;
      do {
        id = generateId("ing");
      } while (existingIds.has(id));
      const nextIngredient: Ingredient = { id, ...ing };
      return [nextIngredient, ...prev];
    });
  }
  function editIngredient(updated: Ingredient) {
    setIngredients((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }
  function deleteIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  // Additional cost handlers
  function addAdditionalCost(item: Omit<AdditionalCostItem, "id">) {
    setAdditionalCosts((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      let id: string;
      do {
        id = generateId("cost");
      } while (existingIds.has(id));
      const nextCost: AdditionalCostItem = { id, ...item };
      return [nextCost, ...prev];
    });
  }
  function editAdditionalCost(updated: AdditionalCostItem) {
    setAdditionalCosts((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }
  function deleteAdditionalCost(id: string) {
    setAdditionalCosts((prev) => prev.filter((i) => i.id !== id));
  }

  const breakdown = useMemo(
    () =>
      calculateBreakdown(
        {
          ingredients,
          additionalCosts,
          numberOfCakes,
          profitPercentage,
          profitMode,
          profitFixedAmount,
        },
        { extraPerBatchCost: businessPerBatchCost }
      ),
    [ingredients, additionalCosts, numberOfCakes, profitPercentage, profitMode, profitFixedAmount, businessPerBatchCost]
  );

  function resetAll() {
    setIngredients([]);
    setAdditionalCosts([]);
    setNumberOfCakes(1);
    setProfitPercentage(0);
    setCakeName("");
    setCurrentProfileId(null);
    setIsEditingName(false);
    setTempName("");
  }

  async function handleSave() {
    setSaveStatus("Saving…");
    const name = cakeName.trim() || "Untitled Cake";
    const profile = await saveCakeProfileRemote({
      id: currentProfileId || undefined,
      name,
      inputs: {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
        profitMode,
        profitFixedAmount,
      },
    });
    setCakeName(profile.name);
    setCurrentProfileId(profile.id);
    setSaveStatus("Saved");
    window.setTimeout(() => setSaveStatus(null), 2000);
  }

  // Removed local-storage sync and background pull

  // Load a profile from URL if id is provided
  useEffect(() => {
    const id = params?.get("id");
    if (!id) return;
    (async () => {
      try {
        const p = await getCakeProfileRemote(id);
        if (!p) return;
        setIngredients(ensureUniqueIds(p.inputs.ingredients || [], "ing"));
        setAdditionalCosts(ensureUniqueIds(p.inputs.additionalCosts || [], "cost"));
        setNumberOfCakes(p.inputs.numberOfCakes || 1);
        setProfitPercentage(p.inputs.profitPercentage || 0);
        // Fallback: if mode unavailable but fixed amount > 0, treat as fixed
        const mode = p.inputs.profitMode ?? (p.inputs.profitFixedAmount && p.inputs.profitFixedAmount > 0 ? "fixed" : "percentage");
        setProfitMode(mode);
        setProfitFixedAmount(p.inputs.profitFixedAmount || 0);
        setCakeName(p.name || "");
        setCurrentProfileId(p.id);
      } catch {
        // ignore
      }
    })();
  }, [params]);

  // Load Business Costs per-batch (equipment + overhead) for current user
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchCombinedPerBatchCost();
        setBusinessPerBatchCost(Math.max(0, Number(res?.combinedPerBatch || 0)));
      } catch {
        setBusinessPerBatchCost(0);
      }
    })();
  }, []);

  function startEditName() {
    setTempName(cakeName);
    setIsEditingName(true);
  }

  function cancelEditName() {
    setTempName(cakeName);
    setIsEditingName(false);
  }

  async function saveEditName() {
    const name = (tempName || "").trim();
    setCakeName(name);
    setIsEditingName(false);
    const profile = await saveCakeProfileRemote({
      id: currentProfileId || undefined,
      name: name || "Untitled Cake",
      inputs: {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
        profitMode,
        profitFixedAmount,
      },
    });
    setCurrentProfileId(profile.id);
    setSaveStatus("Saved");
    window.setTimeout(() => setSaveStatus(null), 2000);
  }



  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Cake Pricing Calculator</h1>
            </div>
            <p className="text-gray-600">Calculate optimal selling price based on costs and desired margin.</p>
            
          </div>
          <div className="flex flex-row items-center gap-2">
            <Button onClick={handleSave}>
              {saveStatus === "Saved" ? "Saved" : "Save This Cake"}
            </Button>
          </div>
        </header>

        <section className="space-y-3">
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 sm:flex-nowrap flex-wrap">
               
                {!isEditingName ? (
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-between">
                    <div className="font-medium text-xl truncate">{cakeName || "Untitled Cake"}</div>
                    <Button variant="outline" onClick={startEditName}>Edit Cake Name</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      placeholder="Cake name"
                      aria-label="Cake name"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                    />
                    <Button onClick={saveEditName}>Save</Button>
                    <Button variant="outline" onClick={cancelEditName}>Cancel</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <IngredientForm onAdd={addIngredient} />
              <IngredientList ingredients={ingredients} onEdit={editIngredient} onDelete={deleteIngredient} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Additional Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AdditionalCostForm onAdd={addAdditionalCost} />
              <AdditionalCostList items={additionalCosts} onEdit={editAdditionalCost} onDelete={deleteAdditionalCost} />
              <div className="text-xs text-gray-600">
                Business Costs per batch auto-applied: {businessPerBatchCost.toLocaleString('vi-VN')} đ
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Production Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductionCalculator numberOfCakes={numberOfCakes} onChange={setNumberOfCakes} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profit Margin</CardTitle>
            </CardHeader>
              <CardContent>
                <ProfitCalculator
                  profitMode={profitMode}
                  profitPercentage={profitPercentage}
                  profitFixedAmount={profitFixedAmount}
                  onChangeMode={setProfitMode}
                  onChangePercentage={setProfitPercentage}
                  onChangeFixedAmount={setProfitFixedAmount}
                />
              </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardContent>
              <ResultsSummary breakdown={breakdown} numberOfCakes={numberOfCakes} profitPercentage={profitPercentage} profitMode={profitMode} />
            </CardContent>
          </Card>
        </section>

        <div className="flex justify-end">
          <Button variant="outline" onClick={resetAll}>Clear all</Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
