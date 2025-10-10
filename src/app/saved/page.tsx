"use client";

import Link from "next/link";
import { listCakeProfiles, deleteCakeProfile, pullProfilesFromSupabaseToLocal } from "@/utils/profiles";
import { useEffect, useState } from "react";
import { formatMoney } from "@/utils/calculations";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { CakeProfile } from "@/utils/profiles";

export default function SavedCakesPage() {
  const [profiles, setProfiles] = useState<CakeProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Pull remote profiles so saved cakes appear across browsers
      await pullProfilesFromSupabaseToLocal();
      if (!cancelled) setProfiles(listCakeProfiles());
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDelete(id: string) {
    deleteCakeProfile(id);
    setProfiles(listCakeProfiles());
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Saved Cakes</h1>
          <Link href="/" className="border rounded px-4 py-2">Back to Calculator</Link>
        </header>

        {profiles.length === 0 ? (
          <p className="text-gray-600">No saved cakes yet. Go back and save your first cake.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Updated</th>
                  <th className="text-right p-2">Selling price/cake</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{new Date(p.updatedAt).toLocaleString()}</td>
                    <td className="p-2 text-right">{formatMoney(p.breakdown.sellingPricePerCake)}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="icon-sm" variant="outline" aria-label="Delete" onClick={() => handleDelete(p.id)}>
                          <Trash2 />
                        </Button>
                        <Link href={`/?id=${encodeURIComponent(p.id)}`} className="bg-blue-600 text-white rounded px-3 py-1">Open</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


