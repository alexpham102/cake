"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEffect } from "react";
import IngredientForm from "@/components/IngredientForm";
import IngredientList from "@/components/IngredientList";
import AdditionalCostForm from "@/components/AdditionalCostForm";
import AdditionalCostList from "@/components/AdditionalCostList";
import ProductionCalculator from "@/components/ProductionCalculator";
import ProfitCalculator from "@/components/ProfitCalculator";
import ResultsSummary from "@/components/ResultsSummary";
import { AdditionalCostItem, Ingredient } from "@/types";
import { calculateBreakdown } from "@/utils/calculations";
import { saveCakeProfile, getCakeProfile, syncAllLocalCakeProfilesToSupabase, pullProfilesFromSupabaseToLocal } from "@/utils/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([]);
  const [numberOfCakes, setNumberOfCakes] = useState<number>(1);
  const [profitPercentage, setProfitPercentage] = useState<number>(0);
  const [cakeName, setCakeName] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>("");

  function generateId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Ingredient handlers
  function addIngredient(ing: Omit<Ingredient, "id">) {
    setIngredients((prev) => [{ id: generateId("ing"), ...ing }, ...prev]);
  }
  function editIngredient(updated: Ingredient) {
    setIngredients((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }
  function deleteIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  // Additional cost handlers
  function addAdditionalCost(item: Omit<AdditionalCostItem, "id">) {
    setAdditionalCosts((prev) => [{ id: generateId("cost"), ...item }, ...prev]);
  }
  function editAdditionalCost(updated: AdditionalCostItem) {
    setAdditionalCosts((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }
  function deleteAdditionalCost(id: string) {
    setAdditionalCosts((prev) => prev.filter((i) => i.id !== id));
  }

  const breakdown = useMemo(
    () =>
      calculateBreakdown({
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
      }),
    [ingredients, additionalCosts, numberOfCakes, profitPercentage]
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

  function handleSave() {
    const name = cakeName.trim() || "Untitled Cake";
    const profile = saveCakeProfile({
      id: currentProfileId || undefined,
      name,
      inputs: {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
      },
    });
    setCakeName(profile.name);
    setCurrentProfileId(profile.id);
    setSaveStatus("Saved");
    window.setTimeout(() => setSaveStatus(null), 2000);
  }

  useEffect(() => {
    // Kick off initial background sync of any existing local profiles
    void syncAllLocalCakeProfilesToSupabase();
    // Also pull remote profiles to keep local fresh when switching browsers/devices
    void pullProfilesFromSupabaseToLocal();

    const id = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id")
      : null;
    if (!id) return;
    const profile = getCakeProfile(id);
    if (!profile) return;
    setIngredients(profile.inputs.ingredients || []);
    setAdditionalCosts(profile.inputs.additionalCosts || []);
    setNumberOfCakes(profile.inputs.numberOfCakes || 1);
    setProfitPercentage(profile.inputs.profitPercentage || 0);
    setCakeName(profile.name || "");
    setCurrentProfileId(profile.id);
    setIsEditingName(false);
    setTempName("");
  }, []);

  function startEditName() {
    setTempName(cakeName);
    setIsEditingName(true);
  }

  function cancelEditName() {
    setTempName(cakeName);
    setIsEditingName(false);
  }

  function saveEditName() {
    const name = (tempName || "").trim();
    setCakeName(name);
    setIsEditingName(false);
    const profile = saveCakeProfile({
      id: currentProfileId || undefined,
      name: name || "Untitled Cake",
      inputs: {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
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
              <ProfitCalculator profitPercentage={profitPercentage} onChange={setProfitPercentage} />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardContent>
              <ResultsSummary breakdown={breakdown} numberOfCakes={numberOfCakes} profitPercentage={profitPercentage} />
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
