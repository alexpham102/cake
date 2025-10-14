"use client";

import { AdditionalCostItem } from "@/types";
import { formatMoney } from "@/utils/calculations";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface AdditionalCostListProps {
  items: AdditionalCostItem[];
  onEdit: (item: AdditionalCostItem) => void;
  onDelete: (id: string) => void;
}

export default function AdditionalCostList({ items, onEdit, onDelete }: AdditionalCostListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editAlloc, setEditAlloc] = useState<AdditionalCostItem["allocationType"]>("batch");

  function startEdit(item: AdditionalCostItem) {
    setEditingId(item.id);
    setEditCategory(item.category);
    setEditDescription(item.description || "");
    setEditAmount(String(item.amount));
    setEditAlloc(item.allocationType);
  }

  function saveEdit(id: string) {
    const amountNum = Number(editAmount);
    if (!editCategory.trim() || !isFinite(amountNum) || amountNum < 0) return;
    onEdit({ id, category: editCategory.trim(), description: editDescription.trim() || undefined, amount: amountNum, allocationType: editAlloc });
    setEditingId(null);
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No additional costs added yet.</p>;
  }

  const totalBatch = items.filter(i => i.allocationType === "batch").reduce((s, i) => s + i.amount, 0);
  const totalPerCake = items.filter(i => i.allocationType === "per-cake").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Allocation</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {editingId === item.id ? (
                  <Input className="h-8" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                ) : (
                  item.category
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <Input className="h-8" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                ) : (
                  item.description || "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingId === item.id ? (
                  <Input
                    className="h-8 text-right"
                    value={editAmount ? Number(editAmount).toLocaleString('vi-VN') : ""}
                    onChange={(e) => {
                      const raw = e.target.value || "";
                      const digitsOnly = raw.replace(/\D/g, "");
                      setEditAmount(digitsOnly);
                    }}
                    type="text"
                    inputMode="numeric"
                  />
                ) : (
                  formatMoney(item.amount)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <Select value={editAlloc} onValueChange={(v) => setEditAlloc(v as AdditionalCostItem["allocationType"]) }>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batch">Per Batch</SelectItem>
                      <SelectItem value="per-cake">Per Cake</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  item.allocationType === "batch" ? "Per Batch" : "Per Cake"
                )}
              </TableCell>
              <TableCell className="flex items-center justify-center gap-2">
                {editingId === item.id ? (
                  <>
                    <Button size="sm" onClick={() => saveEdit(item.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button size="icon-sm" variant="outline" aria-label="Delete" onClick={() => onDelete(item.id)}>
                      <Trash2 />
                    </Button>
                    <Button size="sm" onClick={() => startEdit(item)}>Edit</Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-6 font-semibold">
        <div>Total Per-Batch: {formatMoney(totalBatch)}</div>
        <div>Total Per-Cake: {formatMoney(totalPerCake)}</div>
      </div>
    </div>
  );
}


