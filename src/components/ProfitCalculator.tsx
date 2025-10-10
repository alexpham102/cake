"use client";

interface ProfitCalculatorProps {
  profitPercentage: number;
  onChange: (value: number) => void;
}

export default function ProfitCalculator({ profitPercentage, onChange }: ProfitCalculatorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Profit margin (%)</label>
      <div className="flex items-center gap-2">
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
            onChange(clamped);
          }}
        />
        <span className="font-semibold">%</span>
      </div>
    </div>
  );
}


