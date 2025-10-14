"use client";

import { useState } from "react";
import { AllocationType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface AdditionalCostFormProps {
  onAdd: (item: { category: string; description?: string; amount: number; allocationType: AllocationType }) => void;
}

const predefinedCategories = [
  "Equipment",
  "Packaging",
  "Water",
  "Electricity",
  "Gas",
  "Delivery",
  "Labor",
  "Rent/Overhead",
  "Other",
];

export default function AdditionalCostForm({ onAdd }: AdditionalCostFormProps) {
  const [category, setCategory] = useState<string>(predefinedCategories[0]);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [allocationType, setAllocationType] = useState<AllocationType>("batch");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!isFinite(amountNum) || amountNum < 0) {
      setError("Amount must be a number ≥ 0");
      return;
    }
    onAdd({ category, description: description.trim() || undefined, amount: amountNum, allocationType });
    setDescription("");
    setAmount("");
    setAllocationType("batch");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_1fr_1fr] items-center gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {predefinedCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Description"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          aria-label="Amount"
          placeholder="Amount"
          value={amount ? Number(amount).toLocaleString('vi-VN') : ""}
          onChange={(e) => {
            const raw = e.target.value || "";
            const digitsOnly = raw.replace(/\D/g, "");
            setAmount(digitsOnly);
          }}
          type="text"
          inputMode="numeric"
          required
        />
        <Select value={allocationType} onValueChange={(v) => setAllocationType(v as AllocationType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="batch">Per Batch</SelectItem>
            <SelectItem value="per-cake">Per Cake</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Add Cost</Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}


