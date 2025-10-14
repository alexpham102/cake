"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProfitMode = "percentage" | "fixed";

interface ProfitCalculatorProps {
  profitMode: ProfitMode;
  profitPercentage: number;
  profitFixedAmount: number;
  onChangeMode: (mode: ProfitMode) => void;
  onChangePercentage: (value: number) => void;
  onChangeFixedAmount: (value: number) => void;
}

export default function ProfitCalculator({
  profitMode,
  profitPercentage,
  profitFixedAmount,
  onChangeMode,
  onChangePercentage,
  onChangeFixedAmount,
}: ProfitCalculatorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Profit</label>
      <div className="flex items-center gap-2">
        <Select value={profitMode} onValueChange={(v) => onChangeMode((v as ProfitMode) || "percentage") }>
          <SelectTrigger>
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="fixed">Fixed amount</SelectItem>
          </SelectContent>
        </Select>

        {profitMode === "percentage" ? (
          <div className="flex items-center gap-2 w-full">
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              min={0}
              max={1000}
              step={0.1}
              value={profitPercentage}
              onChange={(e) => {
                const n = Number(e.target.value);
                const clamped = Math.max(0, Math.min(1000, isFinite(n) ? n : 0));
                onChangePercentage(clamped);
              }}
            />
            <span className="font-semibold">%</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <input
              className="border rounded px-3 py-2 w-full"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={isFinite(profitFixedAmount) && profitFixedAmount > 0 ? profitFixedAmount.toLocaleString('vi-VN') : ""}
              onChange={(e) => {
                const raw = e.target.value || "";
                const digitsOnly = raw.replace(/\D/g, "");
                const next = digitsOnly ? Number(digitsOnly) : 0;
                onChangeFixedAmount(next);
              }}
            />
            <span className="font-semibold">đ</span>
          </div>
        )}
      </div>
    </div>
  );
}


