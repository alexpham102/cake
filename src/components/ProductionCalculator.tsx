"use client";

interface ProductionCalculatorProps {
  numberOfCakes: number;
  onChange: (value: number) => void;
}

export default function ProductionCalculator({ numberOfCakes, onChange }: ProductionCalculatorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Number of cakes produced</label>
      <input
        className="border rounded px-3 py-2 w-full"
        type="number"
        min={1}
        step={1}
        value={numberOfCakes}
        onChange={(e) => {
          const val = Math.max(1, Math.floor(Number(e.target.value) || 1));
          onChange(val);
        }}
      />
    </div>
  );
}


