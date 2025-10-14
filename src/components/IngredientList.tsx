"use client";

import { Ingredient } from "@/types";
import { formatMoney } from "@/utils/calculations";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

interface IngredientListProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

export default function IngredientList({ ingredients, onEdit, onDelete }: IngredientListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("");

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setEditName(ing.name);
    setEditCost(String(ing.cost));
    setEditUnit(ing.unit || "");
  }

  function saveEdit(id: string) {
    const costNum = Number(editCost);
    if (!editName.trim() || !isFinite(costNum) || costNum < 0) return;
    onEdit({ id, name: editName.trim(), cost: costNum, unit: editUnit.trim() || undefined });
    setEditingId(null);
  }

  if (ingredients.length === 0) {
    return <p className="text-sm text-gray-500">No ingredients added yet.</p>;
  }

  const total = ingredients.reduce((s, i) => s + i.cost, 0);

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ing) => (
            <TableRow key={ing.id}>
              <TableCell>
                {editingId === ing.id ? (
                  <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} />
                ) : (
                  ing.name
                )}
              </TableCell>
              <TableCell>
                {editingId === ing.id ? (
                  <Input className="h-8" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                ) : (
                  ing.unit || "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingId === ing.id ? (
                  <Input
                    className="h-8 text-right"
                    value={editCost ? Number(editCost).toLocaleString('vi-VN') : ""}
                    onChange={(e) => {
                      const raw = e.target.value || "";
                      const digitsOnly = raw.replace(/\D/g, "");
                      setEditCost(digitsOnly);
                    }}
                    type="text"
                    inputMode="numeric"
                  />
                ) : (
                  formatMoney(ing.cost)
                )}
              </TableCell>
              <TableCell className="flex items-center justify-center gap-2">
                {editingId === ing.id ? (
                  <>
                    <Button size="sm" onClick={() => saveEdit(ing.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button size="icon-sm" variant="outline" aria-label="Delete" onClick={() => onDelete(ing.id)}>
                      <Trash2 />
                    </Button>
                    <Button size="sm" onClick={() => startEdit(ing)}>Edit</Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="text-right font-semibold">Total: {formatMoney(total)}</div>
    </div>
  );
}


