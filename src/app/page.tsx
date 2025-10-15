"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import IngredientForm from "@/components/IngredientForm";
import IngredientList from "@/components/IngredientList";
import AdditionalCostForm from "@/components/AdditionalCostForm";
import AdditionalCostList from "@/components/AdditionalCostList";
import ProductionCalculator from "@/components/ProductionCalculator";
import ProfitCalculator from "@/components/ProfitCalculator";
import ResultsSummary from "@/components/ResultsSummary";
import IngredientsCalculator from "@/components/IngredientsCalculator";
import { AdditionalCostItem, Ingredient, ProfitMode } from "@/types";
import { calculateBreakdown } from "@/utils/calculations";
import { saveCakeProfileRemote, getCakeProfileRemote } from "@/utils/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// removed unused import
import { fetchCombinedPerBatchCost } from "@/utils/businessCosts";
import { getSupabaseClient } from "@/lib/supabaseClient";
import RichTextEditor from "@/components/RichTextEditor";

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
  const [instructions, setInstructions] = useState<string>("");
  const [preservationNotes, setPreservationNotes] = useState<string>("");
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [noteImageUrl, setNoteImageUrl] = useState<string | undefined>(undefined);
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null);
  const preservationRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<"calculator" | "ingredients" | "notes">("calculator");
  const lastSavedSignatureRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isReadyToAutosaveRef = useRef<boolean>(false);

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
  async function uploadImageAndGetUrl(file: File): Promise<string | null> {
    try {
      const supabase = getSupabaseClient();
      const { data: sessionResult } = await supabase.auth.getSession();
      const userId = sessionResult?.session?.user?.id ?? "anon";
      const ext = file.name.split(".").pop() || "jpg";
      const folder = currentProfileId ? `${userId}/${currentProfileId}` : `${userId}/unsaved`;
      const path = `${folder}/pasted-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("cake-notes")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadErr) throw uploadErr;
      // Return a transformed, smaller, sharper URL (2x for retina, display at ~320px)
      const { data: pub } = supabase.storage
        .from("cake-notes")
        .getPublicUrl(path, { transform: { width: 640, quality: 85, resize: "contain" } });
      return pub.publicUrl;
    } catch {
      return null;
    }
  }

  function insertIntoInstructionsAtCursor(text: string) {
    setInstructions((prev) => {
      const el = instructionsRef.current;
      if (!el) return `${prev}${prev.endsWith("\n") ? "" : "\n"}${text}`;
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + text + prev.slice(end);
      // restore caret after React state update
      setTimeout(() => {
        const pos = start + text.length;
        try {
          el.setSelectionRange(pos, pos);
          el.focus();
        } catch {
          // ignore
        }
      }, 0);
      return next;
    });
  }

  function insertIntoPreservationAtCursor(text: string) {
    setPreservationNotes((prev) => {
      const el = preservationRef.current;
      if (!el) return `${prev}${prev.endsWith("\n") ? "" : "\n"}${text}`;
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + text + prev.slice(end);
      setTimeout(() => {
        const pos = start + text.length;
        try {
          el.setSelectionRange(pos, pos);
          el.focus();
        } catch {
          // ignore
        }
      }, 0);
      return next;
    });
  }

  async function handleInstructionsPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const file = it.getAsFile();
        if (!file) return;
        const url = await uploadImageAndGetUrl(file);
        if (url) insertIntoInstructionsAtCursor(`\n![image](${url})\n`);
        return;
      }
    }
    // Fallback for browsers that expose files but not items
    const files = e.clipboardData?.files || [];
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      e.preventDefault();
      const url = await uploadImageAndGetUrl(files[0]);
      if (url) insertIntoInstructionsAtCursor(`\n![image](${url})\n`);
    }
  }

  async function handleInstructionsDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = await uploadImageAndGetUrl(file);
      if (url) insertIntoInstructionsAtCursor(`\n![image](${url})\n`);
    }
  }

  function swallowDrag(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
  }

  async function handlePreservationPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const file = it.getAsFile();
        if (!file) return;
        const url = await uploadImageAndGetUrl(file);
        if (url) insertIntoPreservationAtCursor(`\n![image](${url})\n`);
        return;
      }
    }
    const files = e.clipboardData?.files || [];
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      e.preventDefault();
      const url = await uploadImageAndGetUrl(files[0]);
      if (url) insertIntoPreservationAtCursor(`\n![image](${url})\n`);
    }
  }

  async function handlePreservationDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = await uploadImageAndGetUrl(file);
      if (url) insertIntoPreservationAtCursor(`\n![image](${url})\n`);
    }
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
    setInstructions("");
    setPreservationNotes("");
    setNoteImageFile(null);
    setNoteImageUrl(undefined);
  }

  async function handleSave() {
    try {
      setSaveStatus("Saving…");
      const name = cakeName.trim() || "Untitled Cake";
      const baseInputs = {
        ingredients,
        additionalCosts,
        numberOfCakes,
        profitPercentage,
        profitMode,
        profitFixedAmount,
      };
      // First upsert to ensure we have a stable client id
      const initial = await saveCakeProfileRemote({
        id: currentProfileId || undefined,
        name,
        inputs: baseInputs,
        instructions,
        preservationNotes,
        noteImageUrl: noteImageUrl ?? undefined,
      });

      let uploadedUrl = noteImageUrl;
      if (noteImageFile) {
        try {
          const supabase = getSupabaseClient();
          const { data: sessionResult } = await supabase.auth.getSession();
          const userId = sessionResult?.session?.user?.id ?? "anon";
          const ext = noteImageFile.name.split(".").pop() || "jpg";
          const path = `${userId}/${initial.id}/note-${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("cake-notes")
            .upload(path, noteImageFile, { upsert: true, contentType: noteImageFile.type });
          if (uploadErr) throw uploadErr;
          const { data: pub } = supabase.storage.from("cake-notes").getPublicUrl(path);
          // Use render transformation to constrain width and compress for clarity/speed
          const base = pub.publicUrl;
          uploadedUrl = `${base}?width=720&quality=80&resize=contain`;
        } catch {
          // ignore upload errors to not block saving core data
        }
      }

      const finalPayload = {
        id: initial.id,
        name: initial.name,
        inputs: baseInputs,
        instructions,
        preservationNotes,
        noteImageUrl: uploadedUrl ?? undefined,
      };
      const profile = await saveCakeProfileRemote(finalPayload);
      setCakeName(profile.name);
      setCurrentProfileId(profile.id);
      setNoteImageUrl(profile.noteImageUrl);
      setSaveStatus("Saved");
      // Mark last saved signature and clear one-time file to avoid repeat uploads
      lastSavedSignatureRef.current = JSON.stringify({
        name: finalPayload.name,
        inputs: finalPayload.inputs,
        instructions: finalPayload.instructions,
        preservationNotes: finalPayload.preservationNotes,
        noteImageUrl: finalPayload.noteImageUrl,
      });
      setNoteImageFile(null);
      window.setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus(null);
    }
  }

  // Removed local-storage sync and background pull

  // Load a profile from URL if id is provided
  useEffect(() => {
    const id = params?.get("id");
    if (!id) {
      // Initialize autosave baseline for a new, empty profile
      window.setTimeout(() => {
        if (!isReadyToAutosaveRef.current) {
          const signature = JSON.stringify({
            name: (cakeName.trim() || "Untitled Cake"),
            inputs: { ingredients, additionalCosts, numberOfCakes, profitPercentage, profitMode, profitFixedAmount },
            instructions,
            preservationNotes,
            noteImageUrl: noteImageUrl ?? undefined,
          });
          lastSavedSignatureRef.current = signature;
          isReadyToAutosaveRef.current = true;
        }
      }, 0);
      return;
    }
    // Suspend autosave while loading an existing profile
    isReadyToAutosaveRef.current = false;
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
        setInstructions(p.instructions || "");
        setPreservationNotes(p.preservationNotes || "");
        setNoteImageUrl(p.noteImageUrl || undefined);
      } catch {
        // ignore
      } finally {
        // After state flushes, record baseline signature and re-enable autosave
        window.setTimeout(() => {
          const signature = JSON.stringify({
            name: (cakeName.trim() || "Untitled Cake"),
            inputs: { ingredients, additionalCosts, numberOfCakes, profitPercentage, profitMode, profitFixedAmount },
            instructions,
            preservationNotes,
            noteImageUrl: noteImageUrl ?? undefined,
          });
          lastSavedSignatureRef.current = signature;
          isReadyToAutosaveRef.current = true;
        }, 0);
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
    // Autosave effect will persist this change
  }

  // Debounced autosave on meaningful changes
  useEffect(() => {
    if (!isReadyToAutosaveRef.current) return;
    const signature = JSON.stringify({
      name: (cakeName.trim() || "Untitled Cake"),
      inputs: { ingredients, additionalCosts, numberOfCakes, profitPercentage, profitMode, profitFixedAmount },
      instructions,
      preservationNotes,
      noteImageUrl: noteImageUrl ?? undefined,
    });
    if (lastSavedSignatureRef.current === signature) return;
    if (autosaveTimerRef.current != null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      handleSave().catch(() => setSaveStatus(null));
    }, 1000);
    return () => {
      if (autosaveTimerRef.current != null) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [ingredients, additionalCosts, numberOfCakes, profitPercentage, profitMode, profitFixedAmount, cakeName, instructions, preservationNotes, noteImageUrl]);



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
            {saveStatus ? (
              <div className="text-sm text-gray-600">{saveStatus}</div>
            ) : null}
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

        <section>
          <div className="border-b">
            <nav className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("calculator")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "calculator"
                    ? "border-[#E04C11] text-[#E04C11]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                aria-selected={activeTab === "calculator"}
              >
                Cake Pricing Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ingredients")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "ingredients"
                    ? "border-[#E04C11] text-[#E04C11]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                aria-selected={activeTab === "ingredients"}
              >
                Ingredients Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "notes"
                    ? "border-[#E04C11] text-[#E04C11]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                aria-selected={activeTab === "notes"}
              >
                Notes, Instructions & Preservation
              </button>
            </nav>
          </div>
        </section>

        {activeTab === "calculator" && (
          <>
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
          </>
        )}

        {activeTab === "ingredients" && (
          <section className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Ingredients Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <IngredientsCalculator ingredients={ingredients} numberOfCakes={numberOfCakes} />
              </CardContent>
            </Card>
          </section>
        )}

        {activeTab === "notes" && (
          <section className="space-y-3">
            <Card className="gap-2 pb-2">
              <CardHeader>
                <CardTitle className="text-xl">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-4">
                  <label className="text-sm font-medium">Instructions</label>
                  <RichTextEditor
                    value={instructions}
                    onChange={(v) => setInstructions(v)}
                    placeholder="Describe steps to make this cake"
                    ariaLabel="Instructions editor"
                    onUploadImage={uploadImageAndGetUrl}
                  />
                </div>
                <div className="space-y-4 pt-4">
                  <label className="text-sm font-medium">Preservation Notes</label>
                  <RichTextEditor
                    value={preservationNotes}
                    onChange={(v) => setPreservationNotes(v)}
                    placeholder="How to preserve this cake"
                    ariaLabel="Preservation notes editor"
                    onUploadImage={uploadImageAndGetUrl}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

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
